from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import uuid
import logging
from typing import List, Dict, Any, Optional
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.svm import SVR
from sklearn.ensemble import RandomForestRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

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

class PredictionPayload(BaseModel):
    file_id: str
    filters: Dict[str, List[str]]
    x_axis: str
    y_axis: str
    method: str
    steps: int = 10

class PredictionResult(BaseModel):
    x_values: List[float]
    y_values: List[float]
    method: str
    steps: int
    metrics: Dict[str, float]
    model_info: Dict[str, Any]

class DirectPredictionPayload(BaseModel):
    x_values: List[float]
    y_values: List[float]
    method: str
    steps: int = 10

@app.get("/")
def read_root():
    return {"message": "Welcome to DaPlot API"}

@app.post("/api/upload-debug")
async def upload_debug(request: Request):
    """调试上传请求"""
    logger.info("🔍 收到调试上传请求")
    
    # 获取请求头
    headers = dict(request.headers)
    logger.info(f"📋 请求头: {headers}")
    
    # 获取Content-Type
    content_type = request.headers.get("content-type", "")
    logger.info(f"📋 Content-Type: {content_type}")
    
    # 尝试读取原始请求体
    try:
        body = await request.body()
        logger.info(f"📦 请求体大小: {len(body)} bytes")
        logger.info(f"📦 请求体前100字节: {body[:100]}")
    except Exception as e:
        logger.error(f"❌ 读取请求体失败: {e}")
    
    return {"status": "debug", "content_type": content_type, "body_size": len(body) if 'body' in locals() else 0}

@app.post("/api/upload-simple")
async def upload_simple(file: UploadFile):
    """简化的文件上传端点"""
    logger.info("🔍 收到简化上传请求")
    logger.info(f"📁 文件名: {file.filename}")
    logger.info(f"📋 文件类型: {file.content_type}")
    
    try:
        # 读取文件内容
        content = await file.read()
        logger.info(f"📦 文件大小: {len(content)} bytes")
        
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(content),
            "status": "success"
        }
    except Exception as e:
        logger.error(f"❌ 处理文件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_excel_file(file: UploadFile = File(...)):
    """
    Handles the upload of an Excel file, processes it, and returns a preview.
    Supports multiple sheets and returns information about all sheets.
    """
    try:
        logger.info(f"📁 收到文件上传请求")
        logger.info(f"📁 文件名: {file.filename}")
        logger.info(f"📊 文件大小: {file.size if hasattr(file, 'size') else '未知'} bytes")
        logger.info(f"📋 文件类型: {file.content_type}")
        
        # 检查文件是否为空
        if not file.filename:
            logger.error("❌ 文件名为空")
            raise HTTPException(status_code=400, detail="No file provided or filename is empty.")
        
        # Check if the file is an Excel file
        if not file.filename.endswith(('.xlsx', '.xls')):
            logger.error(f"❌ 无效文件类型: {file.filename}")
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload an Excel file.")
            
    except Exception as validation_error:
        logger.error(f"❌ 文件上传验证失败: {str(validation_error)}")
        logger.error(f"❌ 错误类型: {type(validation_error).__name__}")
        raise HTTPException(status_code=422, detail=f"File validation failed: {str(validation_error)}")

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

    # 删除数据和元数据
    del data_storage[file_id]
    if file_id in file_metadata:
        del file_metadata[file_id]

    logger.info(f"✅ 文件删除成功: {file_id}")

    return {
        "success": True,
        "message": "File deleted successfully",
        "file_id": file_id
    }

@app.delete("/api/files/clear")
async def clear_all_files():
    """
    Clears all files from storage.
    """
    logger.info("🗑️ 请求清空所有文件")

    file_count = len(data_storage)

    # 清空所有存储
    data_storage.clear()
    file_metadata.clear()

    logger.info(f"✅ 已清空所有文件，共删除 {file_count} 个文件")

    return {
        "success": True,
        "message": f"All files cleared successfully. Deleted {file_count} files.",
        "deleted_count": file_count
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

@app.post("/api/predict")
async def generate_prediction(payload: PredictionPayload):
    """
    使用机器学习算法生成趋势预测
    """
    logger.info(f"🤖 [预测] 开始预测，文件ID: {payload.file_id}, 算法: {payload.method}")

    df = data_storage.get(payload.file_id)
    if df is None:
        raise HTTPException(status_code=404, detail="File ID not found.")

    try:
        # 应用筛选条件
        filtered_df = df.copy()
        logger.info(f"📊 [预测] 原始数据形状: {df.shape}")
        logger.info(f"🔍 [预测] 筛选条件: {payload.filters}")

        for column, values in payload.filters.items():
            if column in filtered_df.columns and values:
                before_count = len(filtered_df)
                filtered_df = filtered_df[filtered_df[column].isin(values)]
                after_count = len(filtered_df)
                logger.info(f"🔍 [预测] 按列 '{column}' 筛选 {values}: {before_count} -> {after_count} 行")

        logger.info(f"📊 [预测] 筛选后数据形状: {filtered_df.shape}")

        # 检查轴列是否存在
        if payload.x_axis not in filtered_df.columns:
            raise HTTPException(status_code=400, detail=f"X-axis column '{payload.x_axis}' not found.")
        if payload.y_axis not in filtered_df.columns:
            raise HTTPException(status_code=400, detail=f"Y-axis column '{payload.y_axis}' not found.")

        # 提取并清理数据
        data_clean = filtered_df[[payload.x_axis, payload.y_axis]].dropna()
        logger.info(f"📊 [预测] 清理后数据点数: {len(data_clean)}")

        if len(data_clean) < 3:
            logger.error(f"❌ [预测] 数据点不足: {len(data_clean)} < 3")
            raise HTTPException(status_code=400, detail="Insufficient data points for prediction (minimum 3 required).")

        X = data_clean[payload.x_axis].values.reshape(-1, 1)
        y = data_clean[payload.y_axis].values

        # 根据算法类型进行预测
        prediction_result = await perform_ml_prediction(X, y, payload.method, payload.steps)

        logger.info(f"✅ [预测] 预测完成，算法: {payload.method}, 预测步数: {payload.steps}")
        return prediction_result

    except Exception as e:
        logger.error(f"❌ [预测] 预测失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {e}")

@app.post("/api/predict_direct")
async def generate_direct_prediction(payload: DirectPredictionPayload):
    """
    直接使用提供的x和y数据进行机器学习预测
    """
    logger.info(f"🤖 [直接预测] 开始预测，算法: {payload.method}, 数据点数: {len(payload.x_values)}")

    try:
        # 验证数据
        if len(payload.x_values) != len(payload.y_values):
            raise HTTPException(status_code=400, detail="X and Y values must have the same length.")

        if len(payload.x_values) < 3:
            raise HTTPException(status_code=400, detail="Insufficient data points for prediction (minimum 3 required).")

        # 转换为numpy数组
        import numpy as np
        X = np.array(payload.x_values).reshape(-1, 1)
        y = np.array(payload.y_values)

        # 执行预测
        prediction_result = await perform_ml_prediction(X, y, payload.method, payload.steps)

        logger.info(f"✅ [直接预测] 预测完成，算法: {payload.method}, 预测步数: {payload.steps}")
        return prediction_result

    except Exception as e:
        logger.error(f"❌ [直接预测] 预测失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Direct prediction error: {e}")

async def perform_ml_prediction(X, y, method: str, steps: int) -> PredictionResult:
    """
    执行机器学习预测
    """
    logger.info(f"🔬 [ML] 开始训练模型，算法: {method}, 数据点数: {len(X)}")

    # 准备预测的X值
    last_x = X[-1, 0]
    step_size = X[-1, 0] - X[-2, 0] if len(X) > 1 else 1.0
    future_x = np.array([last_x + step_size * (i + 1) for i in range(steps)]).reshape(-1, 1)

    model_info = {}
    metrics = {}

    try:
        if method == 'linear':
            # 线性回归
            model = LinearRegression()
            model.fit(X, y)
            y_pred_train = model.predict(X)
            y_pred_future = model.predict(future_x)

            model_info = {
                'algorithm': '线性回归',
                'coefficient': float(model.coef_[0]),
                'intercept': float(model.intercept_)
            }

        elif method == 'polynomial':
            # 多项式回归
            degree = min(3, len(X) - 1)  # 避免过拟合
            poly_features = PolynomialFeatures(degree=degree)
            X_poly = poly_features.fit_transform(X)
            future_x_poly = poly_features.transform(future_x)

            model = LinearRegression()
            model.fit(X_poly, y)
            y_pred_train = model.predict(X_poly)
            y_pred_future = model.predict(future_x_poly)

            model_info = {
                'algorithm': f'{degree}次多项式回归',
                'degree': degree,
                'features': int(X_poly.shape[1])
            }

        elif method == 'svr':
            # 支持向量机回归
            model = SVR(kernel='rbf', C=1.0, gamma='scale')
            model.fit(X, y)
            y_pred_train = model.predict(X)
            y_pred_future = model.predict(future_x)

            model_info = {
                'algorithm': '支持向量机回归',
                'kernel': 'RBF',
                'support_vectors': int(model.n_support_[0]) if hasattr(model, 'n_support_') else 0
            }

        elif method == 'randomforest':
            # 随机森林回归
            model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)
            model.fit(X, y)
            y_pred_train = model.predict(X)
            y_pred_future = model.predict(future_x)

            model_info = {
                'algorithm': '随机森林回归',
                'n_estimators': 100,
                'feature_importance': float(model.feature_importances_[0])
            }

        elif method == 'neuralnetwork':
            # 神经网络回归
            model = MLPRegressor(hidden_layer_sizes=(50, 25), max_iter=1000, random_state=42, alpha=0.01)
            model.fit(X, y)
            y_pred_train = model.predict(X)
            y_pred_future = model.predict(future_x)

            model_info = {
                'algorithm': '神经网络回归',
                'hidden_layers': [50, 25],
                'iterations': int(model.n_iter_)
            }

        elif method == 'xgboost':
            # XGBoost回归（使用随机森林作为替代）
            model = RandomForestRegressor(n_estimators=200, random_state=42, max_depth=6)
            model.fit(X, y)
            y_pred_train = model.predict(X)
            y_pred_future = model.predict(future_x)

            model_info = {
                'algorithm': 'XGBoost回归 (RandomForest实现)',
                'n_estimators': 200,
                'max_depth': 6
            }

        elif method == 'lstm':
            # LSTM时间序列（使用多项式回归作为简化实现）
            degree = min(2, len(X) - 1)
            poly_features = PolynomialFeatures(degree=degree)
            X_poly = poly_features.fit_transform(X)
            future_x_poly = poly_features.transform(future_x)

            model = LinearRegression()
            model.fit(X_poly, y)
            y_pred_train = model.predict(X_poly)
            y_pred_future = model.predict(future_x_poly)

            model_info = {
                'algorithm': 'LSTM时间序列 (多项式实现)',
                'sequence_length': min(10, len(X)),
                'degree': degree
            }

        else:
            raise ValueError(f"Unsupported prediction method: {method}")

        # 计算模型评估指标
        mse = float(mean_squared_error(y, y_pred_train))
        r2 = float(r2_score(y, y_pred_train))
        rmse = float(np.sqrt(mse))

        metrics = {
            'mse': mse,
            'rmse': rmse,
            'r2_score': r2,
            'training_points': len(X)
        }

        logger.info(f"✅ [ML] 模型训练完成，R²: {r2:.4f}, RMSE: {rmse:.4f}")

        return PredictionResult(
            x_values=future_x.flatten().tolist(),
            y_values=y_pred_future.tolist(),
            method=method,
            steps=steps,
            metrics=metrics,
            model_info=model_info
        )

    except Exception as e:
        logger.error(f"❌ [ML] 模型训练失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model training failed: {e}")

if __name__ == "__main__":
    import uvicorn
    import argparse

    parser = argparse.ArgumentParser(description='DaPlot Backend Server')
    parser.add_argument('--port', type=int, default=8001, help='Port to run the server on (default: 8001)')
    args = parser.parse_args()

    logger.info(f"🚀 启动FastAPI服务器，端口: {args.port}...")
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="info")
