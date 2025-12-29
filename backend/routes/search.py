from flask import Blueprint, request, jsonify
from backend.services.search_service import search_doctors

search_bp = Blueprint("search", __name__)

@search_bp.route("/api/search")
def search():
    """
    Search doctors with optional filters.
    Returns only verified doctors with contact info masked.
    """
    doctors = search_doctors(
        query=request.args.get("q", ""),
        city=request.args.get("city"),
        area=request.args.get("area"),
        specialty=request.args.get("specialty"),
    )
    # Use to_public_dict to mask contact information
    return jsonify([d.to_public_dict() for d in doctors])
