from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import uuid
import logging
from typing import List, Dict, Any, Optional

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="DaPlot API")

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# A simple in-memory storage for uploaded dataframes
data_storage = {}

class FilterPayload(BaseModel):
    file_id: str
    filters: Dict[str, List[str]]

class PlotDataPayload(BaseModel):
    file_id: str
    filters: Dict[str, List[str]]
    x_axis: str
    y_axis: str

class SaveFilePayload(BaseModel):
    file_id: str
    headers: List[str]
    data: List[List[Any]]
    filename: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "Welcome to DaPlot API"}

@app.post("/api/upload")
async def upload_excel_file(file: UploadFile = File(...)):
    """
    Handles the upload of an Excel file, processes it, and returns a preview.
    """
    logger.info(f"📁 收到文件上传请求: {file.filename}")
    logger.info(f"📊 文件大小: {file.size if hasattr(file, 'size') else '未知'} bytes")
    logger.info(f"📋 文件类型: {file.content_type}")
    
    # Check if the file is an Excel file
    if not file.filename.endswith(('.xlsx', '.xls')):
        logger.error(f"❌ 无效文件类型: {file.filename}")
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an Excel file.")

    try:
        logger.info("🔄 开始读取Excel文件...")
        # Read the Excel file into a pandas DataFrame
        # The file object from UploadFile is a file-like object and can be passed to read_excel
        df = pd.read_excel(file.file)
        logger.info(f"✅ Excel文件读取成功! 数据形状: {df.shape}")
        logger.info(f"📊 列名: {df.columns.tolist()}")
    except Exception as e:
        logger.error(f"❌ Excel文件处理失败: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing Excel file: {e}")

    # Generate a unique ID for this file/dataframe
    file_id = str(uuid.uuid4())
    logger.info(f"🆔 生成文件ID: {file_id}")

    # Store the dataframe in our in-memory storage
    data_storage[file_id] = df
    logger.info(f"💾 数据已存储到内存，当前存储的文件数量: {len(data_storage)}")

    # Get headers
    headers = df.columns.tolist()

    # Get preview data (first 5 rows)
    # Convert NaN to None for JSON compatibility
    preview_df = df.head()
    preview_data = preview_df.where(pd.notnull(preview_df), None).to_dict(orient='records')
    logger.info(f"📋 预览数据准备完成，包含 {len(preview_data)} 行")

    response_data = {
        "file_id": file_id,
        "filename": file.filename,
        "headers": headers,
        "preview_data": preview_data,
    }
    logger.info(f"✅ 文件上传处理完成: {file.filename}")
    return response_data

@app.post("/api/filter")
async def filter_data(payload: FilterPayload):
    """
    Filters the dataframe based on the provided criteria.
    """
    df = data_storage.get(payload.file_id)
    if df is None:
        raise HTTPException(status_code=404, detail="File ID not found.")

    filtered_df = df.copy()

    for column, values in payload.filters.items():
        if column in filtered_df.columns:
            if values: # Ensure there are values to filter by
                filtered_df = filtered_df[filtered_df[column].isin(values)]
        else:
            # Optionally, raise an error if the column doesn't exist
            raise HTTPException(status_code=400, detail=f"Filter column '{column}' not found in data.")

    # Convert NaN to None for JSON compatibility and return as records
    return filtered_df.where(pd.notnull(filtered_df), None).to_dict(orient='records')

@app.get("/api/file/{file_id}")
async def get_file_data(file_id: str):
    """
    Retrieves the complete data for a specific file ID.
    """
    logger.info(f"📁 请求获取文件数据: {file_id}")
    
    df = data_storage.get(file_id)
    if df is None:
        logger.error(f"❌ 文件ID未找到: {file_id}")
        raise HTTPException(status_code=404, detail="File ID not found.")
    
    # Get headers
    headers = df.columns.tolist()
    
    # Get all data (convert NaN to None for JSON compatibility)
    all_data = df.where(pd.notnull(df), None).to_dict(orient='records')
    
    logger.info(f"✅ 文件数据获取成功: {len(all_data)}行 × {len(headers)}列")
    
    return {
        "file_id": file_id,
        "filename": f"file_{file_id[:8]}.xlsx",  # Generate a filename since we don't store original names
        "headers": headers,
        "preview_data": all_data  # Return all data for editing
    }

@app.post("/api/plot_data")
async def get_plot_data(payload: PlotDataPayload):
    """
    Prepares data for plotting by filtering and extracting x and y axis values.
    """
    df = data_storage.get(payload.file_id)
    if df is None:
        raise HTTPException(status_code=404, detail="File ID not found.")

    # Apply filters first
    filtered_df = df.copy()
    for column, values in payload.filters.items():
        if column in filtered_df.columns:
            if values:  # Ensure there are values to filter by
                filtered_df = filtered_df[filtered_df[column].isin(values)]
        else:
            raise HTTPException(status_code=400, detail=f"Filter column '{column}' not found in data.")

    # Check if x_axis and y_axis columns exist
    if payload.x_axis not in filtered_df.columns:
        raise HTTPException(status_code=400, detail=f"X-axis column '{payload.x_axis}' not found in data.")
    if payload.y_axis not in filtered_df.columns:
        raise HTTPException(status_code=400, detail=f"Y-axis column '{payload.y_axis}' not found in data.")

    # Extract x and y values, removing any NaN values
    x_values = filtered_df[payload.x_axis].dropna().tolist()
    y_values = filtered_df[payload.y_axis].dropna().tolist()

    # Ensure both lists have the same length by taking the minimum length
    min_length = min(len(x_values), len(y_values))
    x_values = x_values[:min_length]
    y_values = y_values[:min_length]

    return {
        "x_values": x_values,
        "y_values": y_values,
        "x_label": payload.x_axis,
        "y_label": payload.y_axis
    }

@app.post("/api/save")
async def save_file_data(payload: SaveFilePayload):
    """
    Saves updated file data back to storage.
    """
    logger.info(f"📁 请求保存文件数据: {payload.file_id}")
    
    try:
        # 验证数据格式
        if not payload.headers or not isinstance(payload.headers, list):
            raise HTTPException(status_code=400, detail="Invalid headers format")
        
        if not isinstance(payload.data, list):
            raise HTTPException(status_code=400, detail="Invalid data format")
        
        # 创建DataFrame
        df = pd.DataFrame(payload.data, columns=payload.headers)
        
        # 更新存储
        data_storage[payload.file_id] = df
        
        logger.info(f"✅ 文件数据保存成功: {payload.file_id}, 数据形状: {df.shape}")
        
        return {
            "success": True,
            "message": "File data saved successfully",
            "file_id": payload.file_id,
            "rows": len(payload.data),
            "columns": len(payload.headers)
        }
        
    except Exception as e:
        logger.error(f"❌ 保存文件数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving file data: {e}")

@app.get("/api/files")
async def list_files():
    """
    Returns a list of all stored file IDs and basic information.
    """
    logger.info("📋 请求文件列表")
    
    files_info = []
    for file_id, df in data_storage.items():
        files_info.append({
            "file_id": file_id,
            "rows": len(df),
            "columns": len(df.columns),
            "headers": df.columns.tolist()
        })
    
    logger.info(f"✅ 返回文件列表: {len(files_info)} 个文件")
    return {"files": files_info}

@app.delete("/api/file/{file_id}")
async def delete_file_data(file_id: str):
    """
    Deletes a file from storage.
    """
    logger.info(f"🗑️ 请求删除文件: {file_id}")
    
    if file_id not in data_storage:
        logger.error(f"❌ 文件ID未找到: {file_id}")
        raise HTTPException(status_code=404, detail="File ID not found.")
    
    del data_storage[file_id]
    logger.info(f"✅ 文件删除成功: {file_id}")
    
    return {
        "success": True,
        "message": "File deleted successfully",
        "file_id": file_id
    }
