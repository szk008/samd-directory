"""
Additional unified auth routes appended to existing auth.py
Adds Magic Link and Google OAuth endpoints.
"""

# ==================== MAGIC LINK AUTH ====================

@auth_bp.route("/api/auth/request-magic-link", methods=["POST"])
def request_magic_link():
    """
    Send magic link to email for passwordless authentication.
    Note: Doctor must still provide mobile number during registration.
    """
    data = request.json
    email = data.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"error": "Email required"}), 400
    
    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({"error": "Invalid email format"}), 400
    
    # Get request metadata
    ip_address = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')
    
    # Generate magic token
    session, plain_token = generate_magic_token(email, ip_address, user_agent)
    
    # Get full magic link URL
    magic_link_url = get_magic_link_url(plain_token)
    
    # Send email
    success, message = send_magic_link(email, magic_link_url)
    
    if not success:
        return jsonify({"error": message}), 500
    
    return jsonify({
        "success": True,
        "message": "Magic link sent to your email. Check your inbox!",
        "expires_in_minutes": 15
    })


@auth_bp.route("/api/auth/verify-magic-link", methods=["GET"])
def verify_magic_link_endpoint():
    """
    Verify magic link token and authenticate doctor.
    If doctor doesn't exist, redirect to complete registration with mobile.
    """
    token = request.args.get("token")
    
    if not token:
        return jsonify({"error": "Token required"}), 400
    
    # Verify token
    session, error = verify_magic_token(token)
    
    if error:
        return jsonify({"error": error}), 400
    
    # Find or create doctor
    email = session.identifier
    doctor, is_new, linked = find_or_create_doctor(
        identifier=email,
        method='magic',
        profile_data={'email': email}
    )
    
    if is_new or not doctor.personal_mobile:
        # New doctor or missing mobile - redirect to complete registration
        temp_token = generate_jwt(doctor.id, expires_hours=1)  # Short-lived
        return redirect(f"/doctor/complete-registration?token={temp_token}&method=magic")
    
    # Existing doctor with mobile - direct login
    token = generate_jwt(doctor.id)
    
    return jsonify({
        "success": True,
        "token": token,
        "doctor": doctor.to_public_dict(),
        "linked": linked,
        "message": "Login successful!"
    })


# ==================== GOOGLE OAUTH ====================

@auth_bp.route("/api/auth/google-login", methods=["POST"])
def google_login():
    """
    Authenticate doctor using Google OAuth.
    Mobile number is still REQUIRED and collected during registration if not present.
    """
    data = request.json
    id_token_str = data.get("id_token")
    
    if not id_token_str:
        return jsonify({"error": "Google ID token required"}), 400
    
    # Verify Google token
    user_info, error = verify_google_token(id_token_str)
    
    if error:
        return jsonify({"error": error}), 400
    
    # Find or create doctor
    google_sub = user_info['google_sub']
    doctor, is_new, linked = find_or_create_doctor(
        identifier=google_sub,
        method='google',
        profile_data={
            'email': user_info.get('email'),
            'name': user_info.get('name'),
            'google_sub': google_sub
        }
    )
    
    if is_new or not doctor.personal_mobile:
        # New doctor or missing mobile - need to complete registration
        # Return temporary token to complete profile
        temp_token = generate_jwt(doctor.id, expires_hours=1)
        return jsonify({
            "success": True,
            "needs_registration": True,
            "temp_token": temp_token,
            "doctor": doctor.to_dict(),
            "message": "Please complete your profile with mobile number"
        })
    
    # Existing doctor with complete profile - direct login
    token = generate_jwt(doctor.id)
    
    return jsonify({
        "success": True,
        "token": token,
        "doctor": doctor.to_public_dict(),
        "linked": linked,
        "message": "Google login successful!"
    })


# ==================== COMPLETE REGISTRATION (ALL METHODS) ====================

@auth_bp.route("/api/auth/complete-registration", methods=["POST"])
@jwt_required
def complete_registration():
    """
    Complete doctor registration with required fields (especially mobile).
    Used after Magic Link or Google OAuth for new doctors.
    Mobile number is MANDATORY.
    """
    doctor = Doctor.query.get(request.doctor_id)
    
    if not doctor:
        return jsonify({"error": "Doctor not found"}), 404
    
    data = request.json
    
    # Validate required fields
    errors = validate_required_fields(data, 'complete')
    if errors:
        return jsonify({"error": "; ".join(errors)}), 400
    
    # Update doctor profile with required fields
    doctor.name = data.get("name", doctor.name)
    doctor.personal_mobile = data["personal_mobile"]  # REQUIRED
    doctor.degree = data.get("degree", "")
    doctor.specialty = data["specialty"]  # REQUIRED
    doctor.experience_years = data.get("experience_years", 0)
    doctor.area = data.get("area", "")
    doctor.city = data.get("city", "")
    doctor.latitude = data.get("latitude")
    doctor.longitude = data.get("longitude")
    doctor.clinic_name = data.get("clinic_name", "")
    
    # Mark as self-registered
    doctor.self_registered = True
    
    db.session.commit()
    
    # Issue full JWT
    token = generate_jwt(doctor.id)
    
    return jsonify({
        "success": True,
        "token": token,
        "doctor": doctor.to_dict(),
        "message": "Registration completed! Your profile is pending verification."
    }), 201
