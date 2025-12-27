from flask import Flask, render_template, jsonify, request, redirect, url_for, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_cors import CORS
from database_setup import db, User, Doctor, OTP, PendingDoctor, setup_database
from datetime import datetime, timedelta
import random
import os
import re

app = Flask(__name__, static_folder='.', template_folder='templates')
app.secret_key = 'super_secret_key_change_in_production' 

# Database config
# Database config
database_url = os.environ.get('DATABASE_URL', 'sqlite:///samd.db')
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Init extensions
db.init_app(app)
CORS(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login_page'

# --- Helpers ---
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def generate_otp():
    return str(random.randint(100000, 999999))

# --- HTML Routes ---
@app.route('/')
def home():
    return app.send_static_file('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)

@app.route('/admin')
@login_required
def admin_panel():
    if current_user.role != 'admin':
        return redirect('/dashboard')
    return app.send_static_file('admin.html')

# --- API Routes ---

@app.route('/api/current-user')
def get_current_user():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'name': current_user.name,
            'role': current_user.role,
            'id': current_user.id,
            'doctor_id': current_user.doctor_profile.id if current_user.doctor_profile else None
        })
    return jsonify({'authenticated': False})

# (Removed duplicate get_doctors endpoint)

@app.route('/api/send-otp', methods=['POST'])
def send_otp():
    data = request.json
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'error': 'Phone number required'}), 400
    
    # Check if user exists (or allow sign up if policy permits, here we verify existence)
    # user = User.query.filter_by(phone=phone).first()
    # if not user and not phone == '9999999999': # Allow default admin
    #     return jsonify({'error': 'User not found. Contact Admin.'}), 404

    otp_code = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=5)
    
    # Save OTP
    # Remove old OTPs for this phone
    OTP.query.filter_by(phone=phone).delete()
    
    new_otp = OTP(phone=phone, code=otp_code, expires_at=expiry)
    db.session.add(new_otp)
    db.session.commit()
    
    # SIMULATION: Print to console
    print(f"\n[OTP SIMULATION] Code for {phone}: {otp_code}\n")
    
    # ⚠️ DEVELOPMENT MODE: Return OTP in response
    # 🚨 WARNING: REMOVE THIS BEFORE PRODUCTION! 🚨
    # In production, OTP should ONLY be sent via SMS, never in API response
    return jsonify({
        'success': True, 
        'message': 'OTP sent successfully (Simulated - Check Server Console)',
        'dev_otp': otp_code  # 🚨 REMOVE IN PRODUCTION!
    })

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    phone = data.get('phone')
    code = data.get('code')
    
    print(f"\n[DEBUG] Verify OTP Request: phone={phone}, code={code}")
    
    # Try finding OTP with exact phone first
    otp_entry = OTP.query.filter_by(phone=phone).first()
    print(f"[DEBUG] Exact match search '{phone}': {otp_entry}")
    
    # If not found, try without +91 or with +91 if missing
    if not otp_entry:
        clean_phone = phone.replace('+91', '') if phone.startswith('+91') else '+91' + phone
        otp_entry = OTP.query.filter_by(phone=clean_phone).first()
        print(f"[DEBUG] Alt format search '{clean_phone}': {otp_entry}")
        
    # If still not found, try just the last 10 digits
    if not otp_entry:
        simple_phone = phone[-10:]
        otp_entry = OTP.query.filter((OTP.phone.endswith(simple_phone))).first()
        print(f"[DEBUG] Suffix search '{simple_phone}': {otp_entry}")
        
    if not otp_entry:
        print("[DEBUG] No OTP entry found!")
        return jsonify({'error': 'Invalid or expired OTP'}), 401
        
    print(f"[DEBUG] Found OTP entry: code={otp_entry.code}, expires={otp_entry.expires_at}")
    print(f"[DEBUG] Comparison: Input '{code}' vs DB '{otp_entry.code}'")
    
    if str(otp_entry.code) != str(code):
        print("[DEBUG] Code MISMATCH!")
        return jsonify({'error': f'Invalid OTP (Expected {otp_entry.code}, Got {code})'}), 401
        
    if datetime.utcnow() > otp_entry.expires_at:
        print("[DEBUG] OTP Expired!")
        return jsonify({'error': 'OTP expired'}), 401

        
    # Verify user exists or create new
    # Clean phone for user lookup (digits only)
    user_phone = re.sub(r'[^\d]', '', phone)[-10:] # Last 10 digits
    # ... rest of logic uses user_phone normally ...
    
    # Ensure phone in User table is consistent (10 digits)
    user = User.query.filter((User.phone.endswith(user_phone))).first()
    
    if not user:
        # Create new user if not exists
        # Name default to "User {phone}"
        name = f"User {user_phone}"
        
        # Special case for default admin
        if user_phone == '9879520091':
            role = 'admin'
            name = 'Dr. Shahnavaz Kanuga'
        else:
            role = 'user'
            
        user = User(phone=user_phone, name=name, role=role)
        db.session.add(user)
        db.session.commit()
        print(f"[DEBUG] New user created: {user.name}")

    # Login for BOTH new and existing users
    try:
        login_user(user)
        print(f"[DEBUG] User {user.phone} logged in successfully.")
        
        # Automatic Linking: Check if this user matches an unlinked Doctor profile
        if not user.doctor_profile and user.role != 'admin':
            # normalize user phone (already done as user_phone)
            # Find doctor with matching phone (ends with user_phone)
            doctor_link = Doctor.query.filter(Doctor.phone.like(f"%{user_phone}")).first()
            if doctor_link:
                doctor_link.user_id = user.id
                user.name = doctor_link.name # Sync name
                user.role = 'doctor'
                db.session.commit()
                print(f"[DEBUG] Automatically linked User {user.id} to Doctor {doctor_link.id}")
                
    except Exception as e:
        print(f"[DEBUG] Login/Linking failed: {e}")
        return jsonify({'error': 'Login session failed'}), 500
    
    # Delete used OTP
    db.session.delete(otp_entry)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Logged in successfully',
        'user': {
            'id': user.id,
            'name': user.name,
            'phone': user.phone,
            'role': user.role
        }
    })

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect('/')

# --- Doctor/Admin Data API ---

@app.route('/api/update-profile', methods=['POST'])
@login_required
def update_profile():
    data = request.json
    
    if current_user.role == 'admin':
         # Admin can edit anyone
        doc_id = data.get('id')
        doctor = Doctor.query.get(doc_id)
    else:
        # Doctor can only edit themselves
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
    
    if not doctor:
        return jsonify({'error': 'Profile not found'}), 404
        
    # Update fields
    if 'lat' in data and 'lng' in data:
        doctor.lat = float(data['lat'])
        doctor.lng = float(data['lng'])
        
    if 'name' in data: doctor.name = data['name']
    if 'address' in data: doctor.address = data['address']
    if 'hospital' in data: doctor.hospital = data['hospital']
    if 'specialty' in data: doctor.specialty = data['specialty']
    # ... Add other fields as needed
    
    db.session.commit()
    return jsonify({'message': 'Profile updated successfully'})


@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = User.query.all()
    res = []
    for u in users:
        user_data = {
            'id': u.id,
            'name':u.name,
            'phone': u.phone,
            'role': u.role,
            'doctor_id': u.doctor_profile.id if u.doctor_profile else None,
            'created_at': u.created_at.isoformat() if hasattr(u, 'created_at') and u.created_at else None
        }
        res.append(user_data)
    return jsonify({'users': res})

@app.route('/api/users/<int:user_id>/role', methods=['PUT'])
@login_required
def update_user_role(user_id):
    """Update user role (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    new_role = data.get('role', '').lower()
    
    if new_role not in ['user', 'doctor', 'admin']:
        return jsonify({'error': 'Invalid role. Must be: user, doctor, or admin'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Prevent removing last admin
    if user.role == 'admin' and new_role != 'admin':
        admin_count = User.query.filter_by(role='admin').count()
        if admin_count <= 1:
            return jsonify({'error': 'Cannot remove the last admin user'}), 400
    
    user.role = new_role
    db.session.commit()
    
    return jsonify({'success': True, 'message': f'User role updated to {new_role}'})

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    """Update user details (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Update allowed fields
    if 'name' in data:
        user.name = data['name']
    if 'phone' in data:
        user.phone = data['phone']
    if 'email' in data:
        user.email = data['email']
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'User updated successfully'})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    """Delete a user (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Cannot delete yourself
    if user_id == current_user.id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Prevent deleting last admin
    if user.role == 'admin':
        admin_count = User.query.filter_by(role='admin').count()
        if admin_count <= 1:
            return jsonify({'error': 'Cannot delete the last admin user'}), 400
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'User deleted successfully'})


# --- Doctor Management API ---

@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    doctors = Doctor.query.all()
    return jsonify({'doctors': [{
        'id': d.id,
        'name': d.name,
        'phone': d.phone,
        'specialty': d.specialty,
        'qualification': d.qualification,
        'hospital': d.hospital,
        'address': d.address,
        'lat': d.lat,
        'lng': d.lng,
        'subscriptionTier': d.subscription_tier,
        'verified': d.verified,
        'featured': d.featured,
        'user_id': d.user_id,
        'district': d.district,
        'city': d.city,
        'pincode': d.pincode,
        'normalized_qualification': d.normalized_qualification
    } for d in doctors]})

@app.route('/api/doctors', methods=['POST'])
@login_required
def create_doctor():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    try:
        # Check for duplicate phone (optional but recommended)
        phone = data.get('phone')
        if phone:
            # Simple cleanup for comparison
            clean_phone = re.sub(r'[^\d]', '', phone)[-10:]
            existing = Doctor.query.filter(Doctor.phone.like(f"%{clean_phone}")).first()
            if existing:
                return jsonify({'error': f'Doctor with phone ending in {clean_phone} already exists ({existing.name})'}), 400

        new_doc = Doctor(
            name=data.get('name'),
            phone=data.get('phone'),
            specialty=data.get('specialty'),
            qualification=data.get('qualification'),
            # Auto-set normalized from dropdown value
            normalized_qualification=data.get('qualification'),
            hospital=data.get('hospital'),
            address=data.get('address'),
            district=data.get('district'),
            city=data.get('city'),
            pincode=data.get('pincode'),
            lat=data.get('lat') if data.get('lat') not in [None, ''] else None,
            lng=data.get('lng') if data.get('lng') not in [None, ''] else None,
            subscription_tier=data.get('subscriptionTier', 'basic'),
            verified=data.get('verified', False),
            featured=data.get('featured', False)
        )
        
        db.session.add(new_doc)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Doctor created', 'id': new_doc.id})
    except Exception as e:
        db.session.rollback()
        print(f"Error creating doctor: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/doctors/<int:doctor_id>', methods=['PUT', 'DELETE'])
@login_required
def manage_doctor(doctor_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    doctor = Doctor.query.get_or_404(doctor_id)
    
    try:
        if request.method == 'DELETE':
            db.session.delete(doctor)
            db.session.commit()
            return jsonify({'success': True, 'message': 'Doctor deleted'})
        
        # PUT - Update
        data = request.json
        
        # Duplicate phone check on update
        if 'phone' in data and data['phone']:
             clean_phone = re.sub(r'[^\d]', '', data['phone'])[-10:]
             existing = Doctor.query.filter(Doctor.phone.like(f"%{clean_phone}")).first()
             if existing and existing.id != doctor.id:
                  return jsonify({'error': f'Phone number already used by {existing.name}'}), 400

        if 'name' in data: doctor.name = data['name']
        if 'phone' in data: doctor.phone = data['phone']
        if 'specialty' in data: doctor.specialty = data['specialty']
        if 'qualification' in data: 
            doctor.qualification = data['qualification']
            doctor.normalized_qualification = data['qualification']
        if 'hospital' in data: doctor.hospital = data['hospital']
        if 'address' in data: doctor.address = data['address']
        if 'district' in data: doctor.district = data['district']
        if 'city' in data: doctor.city = data['city']
        if 'pincode' in data: doctor.pincode = data['pincode']
        if 'lat' in data: 
            val = data['lat']
            doctor.lat = val if val not in [None, ''] else None
        if 'lng' in data: 
            val = data['lng']
            doctor.lng = val if val not in [None, ''] else None
        if 'subscriptionTier' in data: doctor.subscription_tier = data['subscriptionTier']
        if 'verified' in data: doctor.verified = data['verified']
        if 'featured' in data: doctor.featured = data['featured']
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Doctor updated'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/issues', methods=['GET'])
@login_required
def get_data_issues():
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # helper for checking non-empty issues
    issues = Doctor.query.filter(Doctor.data_issues != None).filter(Doctor.data_issues != '').all()
    
    return jsonify({
        'issues': [{
            'id': d.id,
            'name': d.name,
            'phone': d.phone,
            'issues': d.data_issues,
            'district': d.district
        } for d in issues]
    })

@app.route('/api/admin/issues/clear/<int:id>', methods=['POST'])
@login_required
def clear_data_issue(id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    doctor = Doctor.query.get(id)
    if doctor:
        doctor.data_issues = None
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'error': 'Doctor not found'}), 404

# --- Pending Doctors API ---

@app.route('/api/doctors/submit', methods=['POST'])
def submit_doctor():
    """Submit a new doctor for admin approval"""
    data = request.json
    
    # Get submitter info if logged in
    submitted_by_phone = None
    submitted_by_user_id = None
    if current_user.is_authenticated:
        submitted_by_phone = current_user.phone
        submitted_by_user_id = current_user.id
    else:
        # Allow submissions from non-logged-in users if they provide phone
        submitted_by_phone = data.get('submitter_phone')
    
    pending_doctor = PendingDoctor(
        name=data.get('name'),
        specialty=data.get('specialty'),
        hospital=data.get('hospital'),
        phone=data.get('phone'),
        email=data.get('email'),
        address=data.get('address'),
        lat=data.get('lat'),
        lng=data.get('lng'),
        qualification=data.get('qualification'),
        experience_years=data.get('experience_years'),
        subscription_tier=data.get('subscription_tier', 'free'),
        submitted_by_phone=submitted_by_phone,
        submitted_by_user_id=submitted_by_user_id,
        status='pending'
    )
    
    db.session.add(pending_doctor)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Thank you! Your submission has been received and is pending admin approval.',
        'id': pending_doctor.id
    })

@app.route('/api/admin/pending-doctors', methods=['GET'])
@login_required
def get_pending_doctors():
    """Get all pending doctor submissions (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from database_setup import PendingDoctor
    pending = PendingDoctor.query.filter_by(status='pending').order_by(PendingDoctor.submitted_at.desc()).all()
    
    result = []
    for p in pending:
        result.append({
            'id': p.id,
            'name': p.name,
            'specialty': p.specialty,
            'hospital': p.hospital,
            'phone': p.phone,
            'email': p.email,
            'address': p.address,
            'lat': p.lat,
            'lng': p.lng,
            'qualification': p.qualification,
            'experience_years': p.experience_years,
            'subscription_tier': p.subscription_tier,
            'submitted_at': p.submitted_at.isoformat() if p.submitted_at else None,
            'submitted_by_phone': p.submitted_by_phone,
            'status': p.status
        })
    
    return jsonify({'pending_doctors': result})

@app.route('/api/admin/approve-doctor/<int:doctor_id>', methods=['POST'])
@login_required
def approve_doctor(doctor_id):
    """Approve a pending doctor (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from database_setup import PendingDoctor
    pending = PendingDoctor.query.get(doctor_id)
    
    if not pending:
        return jsonify({'error': 'Pending doctor not found'}), 404
    
    if pending.status != 'pending':
        return jsonify({'error': 'Doctor already reviewed'}), 400
    
    # Create approved doctor
    new_doctor = Doctor(
        name=pending.name,
        specialty=pending.specialty,
        hospital=pending.hospital,
        phone=pending.phone,
        address=pending.address,
        lat=pending.lat,
        lng=pending.lng,
        qualification=pending.qualification,
        subscription_tier=pending.subscription_tier,
        verified=True,  # Approved doctors are verified
        featured=False
    )
    
    db.session.add(new_doctor)
    
    # Update pending status
    pending.status = 'approved'
    pending.reviewed_by = current_user.id
    pending.reviewed_at = datetime.utcnow()
    pending.review_notes = request.json.get('notes', '')
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Doctor {pending.name} has been approved and added to the directory.',
        'doctor_id': new_doctor.id
    })

@app.route('/api/admin/reject-doctor/<int:doctor_id>', methods=['POST'])
@login_required
def reject_doctor(doctor_id):
    """Reject a pending doctor (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    from database_setup import PendingDoctor
    pending = PendingDoctor.query.get(doctor_id)
    
    if not pending:
        return jsonify({'error': 'Pending doctor not found'}), 404
    
    if pending.status != 'pending':
        return jsonify({'error': 'Doctor already reviewed'}), 400
    
    # Update status to rejected
    pending.status = 'rejected'
    pending.reviewed_by = current_user.id
    pending.reviewed_at = datetime.utcnow()
    pending.review_notes = request.json.get('notes', 'Rejected by admin')
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Doctor {pending.name} submission has been rejected.'
    })


# Serve static folders for JS/CSS
@app.route('/js/<path:path>')
def send_js(path):
    return app.send_static_file(f'js/{path}')

@app.route('/css/<path:path>')
def send_css(path):
    return app.send_static_file(f'css/{path}')
    
@app.route('/data/<path:path>')
def send_data(path):
    return app.send_static_file(f'data/{path}')

if __name__ == '__main__':
    # Initialize DB before running
    if not os.path.exists('samd.db'):
        setup_database(app)
        
    app.run(host='0.0.0.0', port=8080, debug=True)
