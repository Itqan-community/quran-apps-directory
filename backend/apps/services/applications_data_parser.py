"""
Parser for applicationsData.ts file.

This module contains functions to parse the TypeScript file and convert it
to Python dictionaries that can be used by Django migrations.
"""
import json
import re
from pathlib import Path
from typing import Dict, List, Any


def get_applications_data() -> List[Dict[str, Any]]:
    """
    Parse applicationsData.ts and return a list of application dictionaries.

    Returns:
        List of dictionaries, each representing an application
    """
    # Path to the applicationsData.ts file
    data_file_path = Path(__file__).parent.parent.parent.parent / 'src/app/services/applicationsData.ts'

    if not data_file_path.exists():
        raise FileNotFoundError(f"applicationsData.ts not found at {data_file_path}")

    # Read the file
    with open(data_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract the array from the TypeScript export
    # Find the array between the first [ and the closing ]
    match = re.search(r'export const applicationsData = \[(.*?)\]', content, re.DOTALL)
    if not match:
        raise ValueError("Could not find applicationsData array in the file")

    # Convert to JSON format
    array_content = match.group(1)

    # Clean up TypeScript-specific syntax
    # Remove trailing commas
    array_content = re.sub(r',\s*}', '}', array_content)
    array_content = re.sub(r',\s*]', ']', array_content)

    # Convert TypeScript to JSON
    json_content = '[' + array_content + ']'

    # Fix TypeScript syntax issues
    json_content = json_content.replace('"', '\\"')  # Escape quotes temporarily
    json_content = json_content.replace('\\"', '"')  # Unescape properly
    json_content = json_content.replace("'", '"')    # Replace single quotes
    json_content = json_content.replace('"apps"', '"general"')  # Replace apps with general category
    json_content = json_content.replace('true', 'True')  # Convert boolean
    json_content = json_content.replace('false', 'False')
    json_content = json_content.replace('null', 'None')
    json_content = json_content.replace('undefined', 'None')

    # Parse JSON
    try:
        applications = json.loads(json_content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON: {e}")

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
    # Map field names
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

    # Ensure categories is always a list
    if isinstance(cleaned['categories'], str):
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