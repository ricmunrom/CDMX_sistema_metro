import pandas as pd
import numpy as np
from typing import Dict, List
import logging
from ..utils.text_utils import normalize_text

logger = logging.getLogger(__name__)

class DataService:
    def __init__(self):
        self.df = None
        self._stations_cache = None
        self.load_data()

    def load_data(self):
        """
        Carga y preprocesa los datos iniciales
        """
        try:
            logger.info("Cargando datos...")
            self.df = pd.read_csv('../data/afluenciastc_simple_02_2024.csv')
            
            # Convertir fechas
            self.df['fecha'] = pd.to_datetime(self.df['fecha'])
            
            # Normalizar columnas categóricas
            self.df['linea'] = self.df['linea'].apply(normalize_text)
            self.df['estacion'] = self.df['estacion'].apply(normalize_text)
            
            # Ordenar por fecha
            self.df = self.df.sort_values('fecha')
            
            # Validar datos
            self._validate_data()
            
            logger.info(f"Datos cargados exitosamente. Total filas: {len(self.df)}")
            
        except Exception as e:
            logger.error(f"Error al cargar datos: {str(e)}", exc_info=True)
            raise Exception(f"Error en la carga de datos: {str(e)}")

    def _validate_data(self):
        """
        Valida la integridad de los datos cargados
        """
        # Verificar columnas requeridas
        required_columns = ['fecha', 'linea', 'estacion', 'afluencia']
        missing_columns = [col for col in required_columns if col not in self.df.columns]
        if missing_columns:
            raise ValueError(f"Columnas faltantes en el dataset: {missing_columns}")
        
        # Verificar valores nulos
        null_counts = self.df[required_columns].isnull().sum()
        if null_counts.any():
            logger.warning(f"Valores nulos encontrados:\n{null_counts}")
            
            # Rellenar valores nulos en afluencia
            self.df['afluencia'] = self.df['afluencia'].interpolate(method='time')
            
        # Verificar valores negativos en afluencia
        if (self.df['afluencia'] < 0).any():
            logger.warning("Se encontraron valores negativos en afluencia")
            self.df['afluencia'] = self.df['afluencia'].clip(lower=0)

    def _convert_to_json_serializable(self, data):
        """
        Convierte tipos de NumPy a tipos nativos de Python para evitar errores de serialización
        """
        if isinstance(data, dict):
            return {k: self._convert_to_json_serializable(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._convert_to_json_serializable(item) for item in data]
        elif isinstance(data, (np.int64, np.int32, np.int16, np.int8)):
            return int(data)
        elif isinstance(data, (np.float64, np.float32, np.float16)):
            return float(data)
        elif isinstance(data, np.bool_):
            return bool(data)
        elif isinstance(data, np.ndarray):
            return self._convert_to_json_serializable(data.tolist())
        else:
            return data

    def get_time_series(self, linea: str, estacion: str) -> Dict:
        """
        Obtiene la serie temporal de afluencia para una estación específica
        """
        try:
            # Normalizar parámetros de búsqueda
            linea_norm = normalize_text(linea)
            estacion_norm = normalize_text(estacion)
            
            logger.info(f"Buscando datos para Línea: {linea_norm}, Estación: {estacion_norm}")
            
            # Buscar datos
            mask = (self.df['linea'] == linea_norm) & (self.df['estacion'] == estacion_norm)
            station_data = self.df[mask].copy()
            
            if station_data.empty:
                raise ValueError(f"No se encontraron datos para la estación {estacion} en la línea {linea}")
            
            # Calcular estadísticas descriptivas
            stats = self._calculate_station_stats(station_data)
            
            # Agrupar por mes - usar valores nativos Python para evitar problemas de serialización
            monthly_data = []
            for period, group in station_data.groupby(station_data['fecha'].dt.to_period('M')):
                month_record = {
                    'fecha': str(period),
                    'mean': float(group['afluencia'].mean()),
                    'std': float(group['afluencia'].std()),
                    'min': float(group['afluencia'].min()),
                    'max': float(group['afluencia'].max()),
                    'linea': linea_norm,
                    'estacion': estacion_norm,
                    'afluencia': float(group['afluencia'].mean())  # Para compatibilidad con el gráfico
                }
                monthly_data.append(month_record)
            
            # Ordenar por fecha
            monthly_data.sort(key=lambda x: x['fecha'])
            
            result = {
                'estacion': estacion_norm,
                'linea': linea_norm,
                'data': monthly_data,
                'stats': self._convert_to_json_serializable(stats)
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error al obtener serie temporal: {str(e)}", exc_info=True)
            raise Exception(f"Error al obtener datos de la estación: {str(e)}")

    def _calculate_station_stats(self, station_data: pd.DataFrame) -> Dict:
        """
        Calcula estadísticas descriptivas para una estación
        """
        stats = {
            'total_registros': len(station_data),
            'fecha_inicio': station_data['fecha'].min().strftime('%Y-%m-%d'),
            'fecha_fin': station_data['fecha'].max().strftime('%Y-%m-%d'),
            'promedio_diario': float(station_data['afluencia'].mean()),
            'maximo_historico': {
                'valor': float(station_data['afluencia'].max()),
                'fecha': station_data.loc[station_data['afluencia'].idxmax(), 'fecha'].strftime('%Y-%m-%d')
            },
            'minimo_historico': {
                'valor': float(station_data['afluencia'].min()),
                'fecha': station_data.loc[station_data['afluencia'].idxmin(), 'fecha'].strftime('%Y-%m-%d')
            }
        }
        return stats

    def get_available_stations(self) -> List[Dict]:
        """
        Retorna la lista de estaciones disponibles por línea con metadata
        """
        try:
            # Para mejorar rendimiento, crear una cache si no existe
            if not hasattr(self, '_stations_cache') or self._stations_cache is None:
                logger.info("Generando cache de estaciones...")
                
                result = []
                # Obtener líneas y estaciones únicas eficientemente
                unique_combos = self.df[['linea', 'estacion']].drop_duplicates()
                
                for _, row in unique_combos.iterrows():
                    linea = row['linea']
                    estacion = row['estacion']
                    
                    # Filtrar estación específica
                    station_data = self.df[(self.df['linea'] == linea) & 
                                          (self.df['estacion'] == estacion)]
                    
                    if not station_data.empty:
                        station_info = {
                            'linea': linea,
                            'estacion': estacion,
                            'total_registros': int(len(station_data)),
                            'promedio_afluencia': float(station_data['afluencia'].mean())
                        }
                        result.append(station_info)
                
                # Guardar en cache
                self._stations_cache = result
                logger.info(f"Cache de estaciones generada. {len(result)} estaciones encontradas.")
            else:
                logger.info("Usando cache de estaciones existente.")
                
            return self._stations_cache
            
        except Exception as e:
            logger.error(f"Error al obtener estaciones disponibles: {str(e)}", exc_info=True)
            raise Exception(f"Error al obtener lista de estaciones: {str(e)}")
    
    def get_station_data(self, linea: str, estacion: str) -> pd.DataFrame:
        """
        Obtiene los datos completos para una estación específica para usarlos en el pronóstico
        """
        try:
            # Normalizar parámetros de búsqueda
            linea_norm = normalize_text(linea)
            estacion_norm = normalize_text(estacion)
            
            logger.info(f"Obteniendo datos para pronóstico. Línea: {linea_norm}, Estación: {estacion_norm}")
            
            # Filtrar datos
            mask = (self.df['linea'] == linea_norm) & (self.df['estacion'] == estacion_norm)
            station_data = self.df[mask].copy()
            
            if station_data.empty:
                raise ValueError(f"No se encontraron datos para la estación {estacion} en la línea {linea}")
            
            # Ordenar por fecha
            station_data = station_data.sort_values('fecha')
            
            # Verificar que haya suficientes datos para un pronóstico
            if len(station_data) < 90:  # Al menos 3 meses de datos
                logger.warning(f"Datos insuficientes para un pronóstico confiable: {len(station_data)} registros")
            
            logger.info(f"Datos obtenidos: {len(station_data)} registros desde {station_data['fecha'].min().date()} hasta {station_data['fecha'].max().date()}")
            return station_data
            
        except Exception as e:
            logger.error(f"Error al obtener datos para pronóstico: {str(e)}", exc_info=True)
            raise Exception(f"Error al preparar datos para pronóstico: {str(e)}")