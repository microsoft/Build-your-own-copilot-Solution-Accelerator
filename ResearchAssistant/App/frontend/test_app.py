import json
from app import format_as_ndjson  # Assuming 'app' is the module name

def test_format_as_ndjson():
    # Define a sample dictionary object
    obj = {"message": "I ❤️ 🐍 \n and escaped newlines"}
    
    # Call the format_as_ndjson function
    result = format_as_ndjson(obj)
    
    # Expected output: JSON serialized string with a newline at the end
    expected = json.dumps(obj, ensure_ascii=False) + "\n"
    
    # Assert the result matches the expected output
    assert result == expected
