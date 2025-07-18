import pytest
from fastapi.testclient import TestClient
import os

# Add project root to sys.path
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from back_end.main import app

client = TestClient(app)

def test_upload_excel_file():
    """Tests uploading a valid Excel file."""
    file_path = os.path.join('test_data', '原始数据_sin_half.xlsx')
    assert os.path.exists(file_path), f"Test file not found: {file_path}"

    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        response = client.post("/api/upload", files=files)

    assert response.status_code == 200
    data = response.json()
    assert "file_id" in data
    assert data["filename"] == os.path.basename(file_path)
    assert "headers" in data
    assert isinstance(data["headers"], list)
    assert "preview_data" in data
    assert isinstance(data["preview_data"], list)

def test_filter_data_by_project():
    """Tests filtering data by project name."""
    # 1. First, upload a file to get a file_id and data
    file_path = os.path.join('test_data', '原始数据_sin_half.xlsx')
    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        upload_response = client.post("/api/upload", files=files)
    
    assert upload_response.status_code == 200
    upload_data = upload_response.json()
    file_id = upload_data['file_id']

    # 2. Now, test the filter endpoint
    filter_payload = {
        "file_id": file_id,
        "filters": {
            "Project": ["sin_half_z10_super"]
        }
    }
    response = client.post("/api/filter", json=filter_payload)

    # 3. Assert the response
    assert response.status_code == 200
    filtered_data = response.json()
    
    # Check that all returned rows belong to 'sin_half_z10_super'
    assert len(filtered_data) > 0, "Filter returned no data"
    for row in filtered_data:
        assert row['Project'] == 'sin_half_z10_super'
    
    # Check that the count is correct (assuming we know the test data)
    # In '原始数据_sin_half.xlsx', all rows should belong to 'sin_half_z10_super'.
    assert len(filtered_data) > 0

def test_plot_data_endpoint():
    """Tests the plot data endpoint that prepares data for visualization."""
    # 1. First, upload a file to get a file_id
    file_path = os.path.join('test_data', '原始数据_sin_half.xlsx')
    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        upload_response = client.post("/api/upload", files=files)
    
    assert upload_response.status_code == 200
    upload_data = upload_response.json()
    file_id = upload_data['file_id']

    # 2. Filter the data first
    filter_payload = {
        "file_id": file_id,
        "filters": {
            "Project": ["sin_half_z10_super"]
        }
    }
    filter_response = client.post("/api/filter", json=filter_payload)
    assert filter_response.status_code == 200
    filtered_data = filter_response.json()

    # 3. Test the plot data endpoint
    plot_payload = {
        "file_id": file_id,
        "filters": {
            "Project": ["sin_half_z10_super"]
        },
        "x_axis": "α",
        "y_axis": "CL"
    }
    response = client.post("/api/plot_data", json=plot_payload)

    # 4. Assert the response
    assert response.status_code == 200
    plot_data = response.json()
    
    # Check that the response has the expected structure
    assert "x_values" in plot_data
    assert "y_values" in plot_data
    assert "x_label" in plot_data
    assert "y_label" in plot_data
    
    # Check that x_values and y_values are lists with the same length
    assert isinstance(plot_data["x_values"], list)
    assert isinstance(plot_data["y_values"], list)
    assert len(plot_data["x_values"]) == len(plot_data["y_values"])
    assert len(plot_data["x_values"]) > 0
    
    # Check that labels match the requested axes
    assert plot_data["x_label"] == "α"
    assert plot_data["y_label"] == "CL"

def test_save_file_data():
    """Tests saving file data back to storage."""
    # 1. First, upload a file to get a file_id
    file_path = os.path.join('test_data', '原始数据_sin_half.xlsx')
    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        upload_response = client.post("/api/upload", files=files)
    
    assert upload_response.status_code == 200
    upload_data = upload_response.json()
    file_id = upload_data['file_id']
    
    # 2. Test saving modified data
    save_payload = {
        "file_id": file_id,
        "headers": ["Project", "α", "CL", "CD", "Modified"],
        "data": [
            ["sin_half_z10_super", 0.0, 0.1, 0.01, "test1"],
            ["sin_half_z10_super", 1.0, 0.2, 0.02, "test2"],
            ["sin_half_z10_super", 2.0, 0.3, 0.03, "test3"]
        ],
        "filename": "modified_data.xlsx"
    }
    
    response = client.post("/api/save", json=save_payload)
    
    # 3. Assert the response
    assert response.status_code == 200
    save_data = response.json()
    
    assert save_data["success"] == True
    assert save_data["file_id"] == file_id
    assert save_data["rows"] == 3
    assert save_data["columns"] == 5
    
    # 4. Verify the data was actually saved by retrieving it
    get_response = client.get(f"/api/file/{file_id}")
    assert get_response.status_code == 200
    get_data = get_response.json()
    
    assert get_data["headers"] == ["Project", "α", "CL", "CD", "Modified"]
    assert len(get_data["preview_data"]) == 3
    assert get_data["preview_data"][0]["Modified"] == "test1"

def test_list_files():
    """Tests listing all stored files."""
    # 1. Upload a couple of files
    file_path = os.path.join('test_data', '原始数据_sin_half.xlsx')
    file_ids = []
    
    for i in range(2):
        with open(file_path, 'rb') as f:
            files = {'file': (f"test_file_{i}.xlsx", f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            upload_response = client.post("/api/upload", files=files)
        
        assert upload_response.status_code == 200
        file_ids.append(upload_response.json()['file_id'])
    
    # 2. Test listing files
    response = client.get("/api/files")
    
    # 3. Assert the response
    assert response.status_code == 200
    files_data = response.json()
    
    assert "files" in files_data
    assert isinstance(files_data["files"], list)
    assert len(files_data["files"]) >= 2  # At least the files we just uploaded
    
    # Check that our uploaded files are in the list
    file_ids_in_response = [f["file_id"] for f in files_data["files"]]
    for file_id in file_ids:
        assert file_id in file_ids_in_response
    
    # Check file info structure
    for file_info in files_data["files"]:
        assert "file_id" in file_info
        assert "rows" in file_info
        assert "columns" in file_info
        assert "headers" in file_info
        assert isinstance(file_info["headers"], list)

def test_delete_file():
    """Tests deleting a file from storage."""
    # 1. First, upload a file to get a file_id
    file_path = os.path.join('test_data', '原始数据_sin_half.xlsx')
    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        upload_response = client.post("/api/upload", files=files)
    
    assert upload_response.status_code == 200
    upload_data = upload_response.json()
    file_id = upload_data['file_id']
    
    # 2. Verify the file exists
    get_response = client.get(f"/api/file/{file_id}")
    assert get_response.status_code == 200
    
    # 3. Delete the file
    delete_response = client.delete(f"/api/file/{file_id}")
    
    # 4. Assert the delete response
    assert delete_response.status_code == 200
    delete_data = delete_response.json()
    
    assert delete_data["success"] == True
    assert delete_data["file_id"] == file_id
    
    # 5. Verify the file no longer exists
    get_response_after_delete = client.get(f"/api/file/{file_id}")
    assert get_response_after_delete.status_code == 404

def test_save_file_data_invalid_format():
    """Tests saving file data with invalid format."""
    # Test with invalid headers
    save_payload = {
        "file_id": "test_id",
        "headers": None,  # Invalid
        "data": [["test"]]
    }
    
    response = client.post("/api/save", json=save_payload)
    assert response.status_code == 422
    
    # Test with invalid data
    save_payload = {
        "file_id": "test_id",
        "headers": ["col1"],
        "data": "invalid"  # Invalid
    }
    
    response = client.post("/api/save", json=save_payload)
    assert response.status_code == 422

def test_delete_nonexistent_file():
    """Tests deleting a file that doesn't exist."""
    response = client.delete("/api/file/nonexistent_id")
    assert response.status_code == 404
