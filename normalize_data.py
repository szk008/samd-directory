from app import app
from database_setup import db, Doctor
import re

# BBox for Gujarat (Approx)
# Gujarat Extent: 20.1 to 24.7 N, 68.1 to 74.4 E
LAT_MIN, LAT_MAX = 20.0, 24.8
LNG_MIN, LNG_MAX = 68.0, 74.8

# South Gujarat Specific Limit (Lat < 22.5 approx) -> Flag "Check Location" if North of this?
# But user said "OUTSIDE SOUTH GUJARAT".
SG_LAT_MAX = 22.8 # Giving some buffer. Bharuch is around 21.7. Vadodara is 22.3.

def normalize_degree(qual):
    if not qual: return ""
    # Remove dots, spaces, commas from ends
    clean = re.sub(r'[.\s]', '', qual.upper()) # aggressive remove all spaces/dots for matching
    
    # Original for fallback
    original = qual.strip()
    
    # Map common ones
    # We look for substrings in the cleaned string
    mapping = [
        ('MBBS', 'MBBS'),
        ('MD', 'MD'),
        ('MS', 'MS'),
        ('BHMS', 'BHMS'),
        ('BAMS', 'BAMS'),
        ('DHMS', 'DHMS'),
        ('DNB', 'DNB'),
        ('BDS', 'BDS'),
        ('MDS', 'MDS'),
        ('BPT', 'BPT'),
        ('MPT', 'MPT'),
        ('FCPS', 'FCPS')
    ]
    
    found = []
    # Use word boundary check on the original if possible, but cleaned is easier for "M.B.B.S"
    # "M.B.B.S" -> "MBBS".
    
    # improved strategy: simple substring check on cleaned
    for key, val in mapping:
        if key in clean:
            found.append(val)
            
    # Deduplicate
    found = list(set(found))
    
    if found:
        return ', '.join(found)
        
    return original # Fallback

def check_issues(doc):
    issues = []
    
    # 1. Geolocation
    if doc.lat and doc.lng:
        if not (LAT_MIN <= doc.lat <= LAT_MAX and LNG_MIN <= doc.lng <= LNG_MAX):
            issues.append(f"Location OUTSIDE Gujarat ({doc.lat}, {doc.lng})")
        elif doc.lat > SG_LAT_MAX:
             issues.append(f"Location North of South Gujarat ({doc.lat})")
             
    # 2. BHMS Surgeon
    norm_q = doc.normalized_qualification or normalize_degree(doc.qualification)
    if 'BHMS' in norm_q and 'SURGEON' in (doc.specialty or '').upper():
         # Check if they also have MS or MD?
         if 'MS' not in norm_q and 'MD' not in norm_q:
            issues.append("Mismatch: BHMS Doctor marked as SURGEON")
        
    return issues

def run_normalization():
    print("Starting normalization...")
    with app.app_context():
        doctors = Doctor.query.all()
        print(f"Scanning {len(doctors)} doctors...")
        
        updated_count = 0
        
        districts = ['Surat', 'Navsari', 'Valsad', 'Bharuch', 'Tapi', 'Dang', 'Narmada', 'Ahmedabad', 'Vadodara', 'Rajkot', 'Gandhinagar']
        
        for doc in doctors:
            # Normalize
            new_norm = normalize_degree(doc.qualification)
            if doc.normalized_qualification != new_norm:
                doc.normalized_qualification = new_norm
                updated_count += 1
            
            # Check issues
            issues = check_issues(doc)
            new_issues = '; '.join(issues) if issues else None
            
            if doc.data_issues != new_issues:
                doc.data_issues = new_issues
                updated_count += 1
                if new_issues:
                    print(f"Flagged {doc.name}: {issues}")
                
            # Attempt to extract district/pincode
            if doc.address:
                # District
                if not doc.district:
                    # Explicit check for Surat areas if 'Surat' not in address
                    surat_areas = ['surat', 'adajan', 'rander', 'vesu', 'varachha', 'katargam', 'udhna', 
                                  'piplod', 'bhatar', 'city light', 'nanpura', 'athwa', 'majura', 'sachin', 'kamrej']
                    
                    # Generic district check
                    found_district = False
                    for dist in districts:
                        if dist.lower() in doc.address.lower():
                            doc.district = dist
                            found_district = True
                            updated_count += 1
                            break
                    
                    # Fallback: Check Surat areas
                    if not found_district:
                        for area in surat_areas:
                            if area in doc.address.lower():
                                doc.district = 'Surat'
                                updated_count += 1
                                break
                
                # Pincode
                if not doc.pincode:
                    pin_match = re.search(r'\b39\d{4}\b', doc.address)
                    if pin_match:
                        doc.pincode = pin_match.group(0)
                        updated_count += 1
                        
        db.session.commit()
        print(f"Normalization Complete. Updated {updated_count} fields.")

if __name__ == "__main__":
    run_normalization()
