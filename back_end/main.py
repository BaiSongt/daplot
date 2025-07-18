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

# A simple in-memory storage for uploaded dataframes and file metadata
data_storage = {}
file_metadata = {}  # 存储文件元数据，包括原始文件名和sheet信息

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

class FileInfo(BaseModel):
    file_id: str
    filename: str
    sheet_name: Optional[str] = None
    rows: int
    columns: int
    headers: List[str]

@app.get("/")
def read_root():
    return {"message": "Welcome to DaPlot API"}

@app.post("/api/upload")
async def upload_excel_file(file: UploadFile = File(...)):
    """
    Handles the upload of an Excel file, processes it, and returns a preview.
    Supports multiple sheets and returns information about all sheets.
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
        
        # 首先读取所有sheet名称
        excel_file = pd.ExcelFile(file.file)
        sheet_names = excel_file.sheet_names
        logger.info(f"📋 发现 {len(sheet_names)} 个工作表: {sheet_names}")
        
        uploaded_files = []
        
        # 为每个sheet创建一个独立的文件记录
        for sheet_name in sheet_names:
            try:
                # 读取特定sheet的数据
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                logger.info(f"✅ 工作表 '{sheet_name}' 读取成功! 数据形状: {df.shape}")
                logger.info(f"📊 列名: {df.columns.tolist()}")
                
                # 为每个sheet生成唯一ID
                file_id = str(uuid.uuid4())
                logger.info(f"🆔 为工作表 '{sheet_name}' 生成文件ID: {file_id}")
                
                # 存储数据和元数据
                data_storage[file_id] = df
                file_metadata[file_id] = {
                    "original_filename": file.filename,
                    "sheet_name": sheet_name,
                    "upload_time": pd.Timestamp.now().isoformat()
                }
                
                # 获取表头
                headers = df.columns.tolist()
                
                # 获取预览数据（前5行）
                preview_df = df.head()
                preview_data = preview_df.where(pd.notnull(preview_df), None).to_dict(orient='records')
                
                # 构建文件信息
                file_info = {
                    "file_id": file_id,
                    "filename": f"{file.filename} - {sheet_name}" if len(sheet_names) > 1 else file.filename,
                    "original_filename": file.filename,
                    "sheet_name": sheet_name,
                    "headers": headers,
                    "preview_data": preview_data,
                    "rows": len(df),
                    "columns": len(headers)
                }
                
                uploaded_files.append(file_info)
                logger.info(f"✅ 工作表 '{sheet_name}' 处理完成")
                
            except Exception as sheet_error:
                logger.error(f"❌ 处理工作表 '{sheet_name}' 时出错: {str(sheet_error)}")
                continue
        
        if not uploaded_files:
            raise HTTPException(status_code=400, detail="No valid sheets found in the Excel file")
        
        logger.info(f"💾 数据已存储到内存，当前存储的文件数量: {len(data_storage)}")
        
        # 如果只有一个sheet，返回单个文件格式以保持兼容性
        if len(uploaded_files) == 1:
            response_data = uploaded_files[0]
        else:
            # 多个sheet时返回文件列表
            response_data = {
                "multiple_sheets": True,
                "files": uploaded_files,
                "total_sheets": len(uploaded_files)
            }
        
        logger.info(f"✅ 文件上传处理完成: {file.filename}")
        return response_data
        
    except Exception as e:
        logger.error(f"❌ Excel文件处理失败: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing Excel file: {e}")

@app.post("/api/filter")
async def filter_data(payload: FilterPayload):
    """
    Filters the dataframe based on the provided criteria.
    """
    logger.info(f"🔍 [后端] 开始数据筛选，文件ID: {payload.file_id}")
    logger.info(f"🔍 [后端] 筛选条件: {payload.filters}")
    
    df = data_storage.get(payload.file_id)
    if df is None:
        raise HTTPException(status_code=404, detail="File ID not found.")

    logger.info(f"📊 [后端] 原始数据形状: {df.shape}")
    logger.info(f"📊 [后端] 数据列名: {df.columns.tolist()}")
    
    filtered_df = df.copy()

    for column, values in payload.filters.items():
        if column in filtered_df.columns:
            if values: # Ensure there are values to filter by
                logger.info(f"🔍 [后端] 筛选列 '{column}', 筛选值: {values} (类型: {[type(v).__name__ for v in values]})")
                
                # 检查数据列的实际数据类型
                sample_data = filtered_df[column].dropna().head(5).tolist()
                logger.info(f"📊 [后端] 列 '{column}' 样本数据: {sample_data} (类型: {[type(v).__name__ for v in sample_data]})")
                
                # 尝试数据类型转换匹配
                original_count = len(filtered_df)
                
                # 方法1: 直接匹配
                mask1 = filtered_df[column].isin(values)
                count1 = mask1.sum()
                
                # 方法2: 转换为字符串后匹配
                str_values = [str(v) for v in values]
                mask2 = filtered_df[column].astype(str).isin(str_values)
                count2 = mask2.sum()
                
                # 方法3: 尝试将数据列转换为数字后匹配
                try:
                    numeric_column = pd.to_numeric(filtered_df[column], errors='coerce')
                    numeric_values = []
                    for v in values:
                        try:
                            numeric_values.append(float(v))
                        except (ValueError, TypeError):
                            numeric_values.append(v)
                    mask3 = numeric_column.isin(numeric_values)
                    count3 = mask3.sum()
                except:
                    count3 = 0
                    mask3 = pd.Series([False] * len(filtered_df))
                
                logger.info(f"🔍 [后端] 匹配结果 - 直接匹配: {count1}, 字符串匹配: {count2}, 数字匹配: {count3}")
                
                # 选择匹配数量最多的方法
                if count3 > 0 and count3 >= max(count1, count2):
                    filtered_df = filtered_df[mask3]
                    logger.info(f"✅ [后端] 使用数字匹配，筛选后数据行数: {len(filtered_df)}")
                elif count2 > 0 and count2 >= count1:
                    filtered_df = filtered_df[mask2]
                    logger.info(f"✅ [后端] 使用字符串匹配，筛选后数据行数: {len(filtered_df)}")
                else:
                    filtered_df = filtered_df[mask1]
                    logger.info(f"✅ [后端] 使用直接匹配，筛选后数据行数: {len(filtered_df)}")
                    
        else:
            # Optionally, raise an error if the column doesn't exist
            logger.error(f"❌ [后端] 筛选列 '{column}' 在数据中不存在")
            raise HTTPException(status_code=400, detail=f"Filter column '{column}' not found in data.")

    logger.info(f"✅ [后端] 数据筛选完成，最终数据行数: {len(filtered_df)}")
    
    # Convert NaN to None for JSON compatibility and return as records
    result = filtered_df.where(pd.notnull(filtered_df), None).to_dict(orient='records')
    logger.info(f"📤 [后端] 返回筛选结果: {len(result)} 行数据")
    
    return result

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
def list_files():
    """
    Returns a list of all stored files with their metadata.
    """
    logger.info(f"📋 获取文件列表请求，当前存储文件数: {len(data_storage)}")
    
    files_info = []
    for file_id, df in data_storage.items():
        # 获取文件元数据
        metadata = file_metadata.get(file_id, {})
        original_filename = metadata.get("original_filename", f"file_{file_id[:8]}.xlsx")
        sheet_name = metadata.get("sheet_name")
        
        # 构建显示文件名
        if sheet_name:
            display_filename = f"{original_filename} - {sheet_name}"
        else:
            display_filename = original_filename
        
        file_info = {
            "file_id": file_id,
            "filename": display_filename,
            "original_filename": original_filename,
            "sheet_name": sheet_name,
            "rows": len(df),
            "columns": len(df.columns),
            "headers": df.columns.tolist(),
            "upload_time": metadata.get("upload_time")
        }
        files_info.append(file_info)
    
    logger.info(f"✅ 返回 {len(files_info)} 个文件的信息")
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

@app.get("/api/unique_values/{file_id}/{column_name}")
async def get_unique_values(file_id: str, column_name: str):
    """
    Returns unique values for a specific column in a file.
    """
    logger.info(f"🔍 请求获取唯一值: 文件ID={file_id}, 列名={column_name}")
    
    df = data_storage.get(file_id)
    if df is None:
        logger.error(f"❌ 文件ID未找到: {file_id}")
        raise HTTPException(status_code=404, detail="File ID not found.")
    
    if column_name not in df.columns:
        logger.error(f"❌ 列名未找到: {column_name}")
        raise HTTPException(status_code=404, detail=f"Column '{column_name}' not found in data.")
    
    try:
        # 获取唯一值，排除NaN
        unique_values = df[column_name].dropna().unique().tolist()
        logger.info(f"✅ 获取到 {len(unique_values)} 个唯一值")
        
        return {
            "values": unique_values,
            "count": len(unique_values),
            "column": column_name
        }
        
    except Exception as e:
        logger.error(f"❌ 获取唯一值失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting unique values: {e}")
