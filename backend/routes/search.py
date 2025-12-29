from flask import Blueprint, request, jsonify
from backend.services.search_service import search_doctors

search_bp = Blueprint("search", __name__)

@search_bp.route("/api/search")
def search():
    doctors = search_doctors(
        query=request.args.get("q", ""),
        city=request.args.get("city"),
        area=request.args.get("area"),
        specialty=request.args.get("specialty"),
    )
    return jsonify([d.to_dict() for d in doctors])
