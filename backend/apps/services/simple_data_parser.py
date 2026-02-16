"""
Simple parser for applicationsData.ts.
This uses a much simpler approach to handle the TypeScript format.
"""
import re
from pathlib import Path
from typing import Dict, List, Any


def extract_js_object(text: str, start_pattern: str) -> List[Dict[str, Any]]:
    """
    Extract JavaScript objects from a string.
    This is more reliable than trying to convert TypeScript to JSON.
    """
    # Find array content
    match = re.search(rf'{start_pattern}\s*\[(.*?)\]', text, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find array pattern: {start_pattern}")

    array_content = match.group(1)

    # Split into objects
    objects = []
    obj_pattern = r'{(.*?)}'
    obj_matches = re.findall(obj_pattern, array_content, re.DOTALL)

    for obj_match in obj_matches:
        # Extract key-value pairs
        obj_dict = {}
        pairs = obj_match.split(',')

        for pair in pairs:
            pair = pair.strip()
            if ':' in pair:
                key, value = pair.split(':', 1)
                key = key.strip()
                value = value.strip()

                # Clean up values
                if value.startswith('"') and value.endswith('"'):
                    # String
                    obj_dict[key] = value[1:-1].replace('\\"', '"')
                elif value == 'true':
                    obj_dict[key] = True
                elif value == 'false':
                    obj_dict[key] = False
                elif value == 'null':
                    obj_dict[key] = None
                else:
                    # Number or other
                    try:
                        obj_dict[key] = float(value) if '.' in value else int(value)
                    except:
                        obj_dict[key] = value

        if obj_dict:  # Only add if we extracted something
            objects.append(obj_dict)

    return objects


def get_applications_data() -> List[Dict[str, Any]]:
    """
    Parse applicationsData.ts and return a list of application dictionaries.
    """
    # Path to the applicationsData.ts file
    data_file_path = Path(__file__).parent.parent.parent.parent / 'src/app/services/applicationsData.ts'

    if not data_file_path.exists():
        raise FileNotFoundError(f"applicationsData.ts not found at {data_file_path}")

    # Read the file
    with open(data_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract applications
    applications = extract_js_object(content, 'export const applicationsData')

    # Clean up the data
    cleaned_applications = []
    for app in applications:
        cleaned_app = _clean_application_data(app)
        cleaned_applications.append(cleaned_app)

    return cleaned_applications


def _clean_application_data(app: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean and normalize application data.
    """
    # Map field names and clean up
    cleaned = {
        'id': app.get('id', ''),
        'Name_En': app.get('Name_En', ''),
        'Name_Ar': app.get('Name_Ar', ''),
        'Short_Description_En': app.get('Short_Description_En', ''),
        'Short_Description_Ar': app.get('Short_Description_Ar', ''),
        'Description_En': app.get('Description_En', ''),
        'Description_Ar': app.get('Description_Ar', ''),
        'status': app.get('status', 'pending'),
        'sort': app.get('sort', 999),
        'Apps_Avg_Rating': float(app.get('Apps_Avg_Rating', 0)),
        'categories': app.get('categories', []),
        'screenshots_ar': app.get('screenshots_ar', []),
        'screenshots_en': app.get('screenshots_en', []),
        'mainImage_ar': app.get('mainImage_ar'),
        'mainImage_en': app.get('mainImage_en'),
        'applicationIcon': app.get('applicationIcon'),
        'Developer_Logo': app.get('Developer_Logo'),
        'Developer_Name_En': app.get('Developer_Name_En', ''),
        'Developer_Name_Ar': app.get('Developer_Name_Ar', ''),
        'Developer_Website': app.get('Developer_Website'),
        'Google_Play_Link': app.get('Google_Play_Link'),
        'AppStore_Link': app.get('AppStore_Link'),
        'App_Gallery_Link': app.get('App_Gallery_Link'),
    }

    # Validate required fields
    required_fields = ['Name_En', 'Name_Ar']
    for field in required_fields:
        if not cleaned[field]:
            cleaned[field] = f'Unknown {field}'

    # Normalize categories
    if cleaned['categories'] == 'apps':
        cleaned['categories'] = ['general']
    elif isinstance(cleaned['categories'], str):
        cleaned['categories'] = [cleaned['categories']]

    # Ensure screenshots are lists
    if not isinstance(cleaned['screenshots_ar'], list):
        cleaned['screenshots_ar'] = []
    if not isinstance(cleaned['screenshots_en'], list):
        cleaned['screenshots_en'] = []

    return cleaned


def get_categories_from_data() -> List[str]:
    """
    Extract all unique categories from applicationsData.
    """
    applications = get_applications_data()
    categories = set()

    for app in applications:
        app_categories = app.get('categories', [])
        if isinstance(app_categories, str):
            app_categories = [app_categories]
        categories.update(app_categories)

    return sorted(list(categories))


def get_developers_from_data() -> List[str]:
    """
    Extract all unique developers from applicationsData.
    """
    applications = get_applications_data()
    developers = set()

    for app in applications:
        dev_name = app.get('Developer_Name_En', '')
        if dev_name:
            developers.add(dev_name)

    return sorted(list(developers))