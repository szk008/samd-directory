"""
SAMD Directory Data Extractor
Parses PDF and extracts structured doctor data
"""

from pypdf import PdfReader
import re
import json
import os

def extract_doctors_from_pdf(pdf_path):
    """Extract all doctor entries from the SAMD directory PDF"""
    
    reader = PdfReader(pdf_path)
    
    # Define all specialty categories found in the directory
    specialties = [
        "ANESTHESIOLOGIST",
        "CARDIOLOGIST (INTERVENTIONAL)",
        "CONSULTING PHYSICIAN",
        "COMMUNITY MEDICINE & FORENSIC MEDICINE",
        "DERMATOLOGIST",
        "E N T SURGEON",
        "ENT SURGEON",
        "INTERVENTIONAL SPINE & PAIN PHYSICIAN",
        "NEUROPHYSICIAN",
        "OBSTETRICIAN & GYNAECOLOGIST",
        "ONCOPHYSICIAN",
        "OPHTHALMOLOGIST",
        "OPTHALMOLOGIST & RETINAL SURGEON",
        "ORTHOPAEDIC SURGEON",
        "PATHOLOGIST",
        "PATHOLOGIST & MICROBIOLOGIST",
        "PAEDIATRICIAN",
        "PAEDITRICIAN",
        "PLASTIC SURGEON",
        "PSYCHIATRIST",
        "RADIOLOGIST & SONOLOGIST",
        "SURGEON",
        "UROLOGIST",
        "UROSURGEON",
        "DENTAL SURGEON- M.D.S.",
        "DENTAL SURGEON- B.D.S.",
        "FAMILY PHYSICIAN-ALLOPATH",
        "FAMILY PHYSICIAN-HOMEOPATH",
        "FAMILY PHYSICIAN-AYURVEDA",
        "FAMILY PHYSICIAN-UNANI",
        "PHYSIOTHERAPIST",
        "AUXILIARY MEMBERS"
    ]
    
    # Extract all text
    all_text = ""
    for page in reader.pages:
        text = page.extract_text()
        if text:
            all_text += text + "\n"
    
    doctors = []
    current_specialty = "GENERAL"
    
    # Split into lines and process
    lines = all_text.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Check if this line is a specialty header
        for spec in specialties:
            if spec in line.upper() and "DR" not in line:
                current_specialty = spec
                break
        
        # Check if this is a doctor entry (starts with DR. or DR )
        if re.match(r'^DR[.\s]', line, re.IGNORECASE):
            doctor = parse_doctor_entry(lines, i, current_specialty)
            if doctor:
                doctors.append(doctor)
                # Skip lines we've consumed
                i += doctor.get('_lines_consumed', 1)
                continue
        
        i += 1
    
    return doctors

def parse_doctor_entry(lines, start_idx, specialty):
    """Parse a single doctor entry starting from given index"""
    
    doctor = {
        "id": start_idx,
        "name": "",
        "qualification": "",
        "phone": "",
        "hospital": "",
        "address": "",
        "specialty": specialty,
        "verified": False,
        "lat": None,
        "lng": None
    }
    
    # Get name from first line
    name_line = lines[start_idx].strip()
    # Clean up name
    name_match = re.match(r'^(DR[.\s]+[A-Z][A-Za-z\s.]+)', name_line)
    if name_match:
        doctor["name"] = name_match.group(1).strip()
    else:
        doctor["name"] = name_line
    
    lines_consumed = 1
    collected_lines = []
    
    # Collect next few lines until we hit another DR. or specialty
    for j in range(start_idx + 1, min(start_idx + 10, len(lines))):
        next_line = lines[j].strip()
        
        # Stop if we hit another doctor
        if re.match(r'^DR[.\s]', next_line, re.IGNORECASE):
            break
        
        # Stop if we hit a specialty header
        if any(spec in next_line.upper() for spec in ["ANESTHESIOLOGIST", "CARDIOLOGIST", "PHYSICIAN", "SURGEON", "PAEDIATRICIAN", "PAEDITRICIAN", "PATHOLOGIST", "OPHTHALMOLOGIST", "RADIOLOGIST", "DERMATOLOGIST", "NEUROPHYSICIAN", "ONCOPHYSICIAN", "PSYCHIATRIST", "UROLOGIST", "PHYSIOTHERAPIST", "AUXILIARY"]) and "DR" not in next_line:
            break
        
        # Skip empty lines but count them
        if next_line:
            collected_lines.append(next_line)
        lines_consumed += 1
    
    # Parse collected lines
    for line in collected_lines:
        # Check for phone number
        phone_match = re.search(r'(\d{10})', line.replace(' ', ''))
        if phone_match and not doctor["phone"]:
            doctor["phone"] = phone_match.group(1)
        
        # Check for qualification (M.B.B.S, M.D, etc.)
        qual_patterns = [
            r'(M\.?B\.?B\.?S[^,\n]*)',
            r'(M\.?D[^,\n]*)',
            r'(M\.?S[^,\n]*)',
            r'(D\.?N\.?B[^,\n]*)',
            r'(D\.?C\.?H[^,\n]*)',
            r'(D\.?G\.?O[^,\n]*)',
            r'(D\.?M[^,\n]*)',
            r'(B\.?D\.?S[^,\n]*)',
            r'(M\.?D\.?S[^,\n]*)',
        ]
        
        for pattern in qual_patterns:
            qual_match = re.search(pattern, line, re.IGNORECASE)
            if qual_match and not doctor["qualification"]:
                doctor["qualification"] = line.strip()
                break
        
        # Everything else is likely hospital/address
        if not phone_match and not doctor.get("qualification") == line.strip():
            if line and len(line) > 3:
                if not doctor["hospital"]:
                    doctor["hospital"] = line
                else:
                    doctor["address"] += " " + line if doctor["address"] else line
    
    doctor["_lines_consumed"] = lines_consumed
    
    # Clean up address - append hospital if address is empty
    if doctor["hospital"] and not doctor["address"]:
        doctor["address"] = doctor["hospital"]
    elif doctor["hospital"] and doctor["address"]:
        doctor["address"] = doctor["hospital"] + ", " + doctor["address"]
    
    # Add region for geocoding
    if doctor["address"] and "SURAT" not in doctor["address"].upper():
        doctor["address"] += ", Surat, Gujarat, India"
    elif doctor["address"]:
        doctor["address"] += ", Gujarat, India"
    
    return doctor

def clean_doctors_data(doctors):
    """Clean and deduplicate doctor entries"""
    
    seen_names = set()
    cleaned = []
    
    for doc in doctors:
        # Remove internal tracking field
        if "_lines_consumed" in doc:
            del doc["_lines_consumed"]
        
        # Skip if no name
        if not doc["name"] or len(doc["name"]) < 5:
            continue
        
        # Clean name
        doc["name"] = re.sub(r'\s+', ' ', doc["name"]).strip()
        
        # Skip duplicates
        if doc["name"] in seen_names:
            continue
        seen_names.add(doc["name"])
        
        # Assign unique ID
        doc["id"] = len(cleaned) + 1
        
        cleaned.append(doc)
    
    return cleaned

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    
    pdf_path = os.path.join(project_dir, "SAMD Directory 2024 VERSION 2.pdf")
    output_dir = os.path.join(project_dir, "data")
    output_path = os.path.join(output_dir, "doctors.json")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Extracting doctors from: {pdf_path}")
    
    doctors = extract_doctors_from_pdf(pdf_path)
    print(f"Found {len(doctors)} raw entries")
    
    doctors = clean_doctors_data(doctors)
    print(f"Cleaned to {len(doctors)} unique doctors")
    
    # Save to JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "meta": {
                "source": "SAMD Directory 2024 VERSION 2",
                "extracted": "2024-12-24",
                "total_doctors": len(doctors)
            },
            "doctors": doctors
        }, f, indent=2, ensure_ascii=False)
    
    print(f"Saved to: {output_path}")
    
    # Print specialty breakdown
    specs = {}
    for doc in doctors:
        spec = doc["specialty"]
        specs[spec] = specs.get(spec, 0) + 1
    
    print("\nSpecialty breakdown:")
    for spec, count in sorted(specs.items(), key=lambda x: -x[1]):
        print(f"  {spec}: {count}")

if __name__ == "__main__":
    main()
