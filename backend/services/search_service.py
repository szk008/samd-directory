from backend.models.doctor import Doctor
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * \
        math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def search_doctors(query="", city=None, area=None, specialty=None, limit=50, user_lat=None, user_lng=None):
    q = Doctor.query.filter(Doctor.verified == True)
    
    # Text Search
    if query:
        q = q.filter(
            Doctor.name.ilike(f"%{query}%") |
            Doctor.specialty.ilike(f"%{query}%") |
            Doctor.area.ilike(f"%{query}%")
        )

    if city:
        q = q.filter(Doctor.city == city)

    if area:
        q = q.filter(Doctor.area == area)

    if specialty:
        q = q.filter(Doctor.specialty == specialty)

    doctors = q.all()

    # Distance Sorting
    if user_lat and user_lng:
        try:
             doctors.sort(
                key=lambda d: haversine(
                    float(user_lat), float(user_lng), d.latitude, d.longitude
                ) if d.latitude and d.longitude else float('inf')
            )
        except Exception as e:
            print(f"Error sorting by distance: {e}")

    # Rating sort as fallback/secondary is generally good, but for now strict distance if provided
    if not (user_lat and user_lng):
         doctors.sort(key=lambda x: x.rating or 0, reverse=True)

    return doctors[:limit]
