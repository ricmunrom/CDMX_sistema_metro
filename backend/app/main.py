from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .services.data_service import DataService
from .services.forecast_service import ForecastService
from typing import Dict, List
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar servicios
data_service = DataService()
forecast_service = ForecastService()

@app.get("/")
async def root():
    return {"message": "API del Sistema Metro CDMX"}

@app.get("/api/stations")
async def get_stations() -> List[Dict]:
    """Obtiene la lista de todas las estaciones disponibles"""
    logger.info("Solicitando lista de estaciones")
    try:
        stations = data_service.get_available_stations()
        logger.info(f"Retornando {len(stations)} estaciones")
        return stations
    except Exception as e:
        logger.error(f"Error al obtener estaciones: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/timeseries/{linea}/{estacion}")
async def get_time_series(linea: str, estacion: str) -> Dict:
    """Obtiene la serie temporal para una estación específica"""
    logger.info(f"Solicitando serie temporal para línea: {linea}, estación: {estacion}")
    try:
        data = data_service.get_time_series(linea, estacion)
        logger.info("Datos encontrados exitosamente")
        return data
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/forecast/{linea}/{estacion}")
async def get_forecast(linea: str, estacion: str) -> Dict:
    """Genera un pronóstico para una estación específica"""
    logger.info(f"Solicitando pronóstico para línea: {linea}, estación: {estacion}")
    try:
        # Obtener datos de la estación
        station_data = data_service.get_station_data(linea, estacion)
        
        # Generar pronóstico
        forecast_result = forecast_service.generate_forecast(station_data)
        
        logger.info("Pronóstico generado exitosamente")
        return {
            "estacion": estacion,
            "linea": linea,
            "forecast": forecast_result
        }
    except Exception as e:
        logger.error(f"Error al generar pronóstico: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))