import pandas as pd
import numpy as np
from prophet import Prophet
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class ForecastService:
    def __init__(self):
        self.model = None
        self.forecast_horizon = 12  # meses hacia el futuro
        
    def _prepare_data_for_prophet(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepara datos para Prophet"""
        # Prophet requiere columnas 'ds' y 'y'
        prophet_df = pd.DataFrame({
            'ds': df['fecha'],
            'y': df['afluencia']
        })
        return prophet_df
    
    def _detect_anomalies(self, df: pd.DataFrame) -> List[Dict]:
        """Detecta períodos anómalos como COVID"""
        anomalies = []
        
        # Detectar caída por COVID (2020-03 a 2020-08)
        covid_start = pd.Timestamp('2020-03-01')
        covid_end = pd.Timestamp('2020-08-31')
        
        # Calcular promedio antes de COVID
        pre_covid = df[(df['fecha'] < covid_start) & 
                        (df['fecha'] >= covid_start - pd.Timedelta(days=365))]
        
        if not pre_covid.empty:
            pre_covid_avg = pre_covid['afluencia'].mean()
            
            # Período COVID
            covid_period = df[(df['fecha'] >= covid_start) & (df['fecha'] <= covid_end)]
            
            if not covid_period.empty:
                covid_avg = covid_period['afluencia'].mean()
                
                # Si hay caída significativa (>30%)
                if covid_avg < pre_covid_avg * 0.7:
                    anomalies.append({
                        'name': 'COVID-19',
                        'start_date': covid_start.strftime('%Y-%m-%d'),
                        'end_date': covid_end.strftime('%Y-%m-%d'),
                        'impact_percent': round((1 - covid_avg/pre_covid_avg) * 100, 1)
                    })
        
        return anomalies
    
    def generate_forecast(self, station_data: pd.DataFrame) -> Dict[str, Any]:
        """
        Genera pronóstico para los datos de una estación
        """
        try:
            logger.info("Generando pronóstico...")
            
            # Preparar datos
            df = station_data.copy()
            # Asegurarse que fecha es datetime
            df['fecha'] = pd.to_datetime(df['fecha'])
            df = df.sort_values('fecha')
            
            # Detectar anomalías como COVID
            anomalies = self._detect_anomalies(df)
            
            # Preparar datos para Prophet
            prophet_data = self._prepare_data_for_prophet(df)
            
            # Dividir en entrenamiento y prueba (últimos 6 meses)
            cutoff_date = df['fecha'].max() - pd.Timedelta(days=180)
            train_data = prophet_data[prophet_data['ds'] <= cutoff_date].copy()
            test_data = prophet_data[prophet_data['ds'] > cutoff_date].copy()
            
            # Configurar modelo
            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=False,
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=10.0
            )
            
            # Añadir regresores para eventos especiales
            covid_dates = None
            if anomalies:
                for anomaly in anomalies:
                    # Agregar regresor para COVID
                    if anomaly['name'] == 'COVID-19':
                        covid_dates = pd.date_range(
                            start=anomaly['start_date'],
                            end=anomaly['end_date']
                        )
                        train_data['covid_impact'] = train_data['ds'].isin(covid_dates).astype(int)
                        model.add_regressor('covid_impact')
            
            # Entrenar modelo
            model.fit(train_data)
            
            # Generar fechas futuras para pronóstico
            last_date = df['fecha'].max()
            future_dates = pd.date_range(
                start=last_date + pd.Timedelta(days=1),
                periods=self.forecast_horizon * 30,  # ~30 días por mes
                freq='D'
            )
            
            # Crear dataframe para pronóstico (incluye train, test y futuro)
            future_df = pd.DataFrame({'ds': pd.concat([
                prophet_data['ds'],
                pd.Series(future_dates)
            ]).drop_duplicates().sort_values()})
            
            # Añadir regresores si existen
            if 'covid_impact' in train_data.columns:
                future_df['covid_impact'] = future_df['ds'].isin(covid_dates).astype(int)
            
            # Generar pronóstico
            forecast = model.predict(future_df)
            
            # Dividir resultados
            train_forecast = forecast[forecast['ds'] <= cutoff_date]
            test_forecast = forecast[(forecast['ds'] > cutoff_date) & (forecast['ds'] <= last_date)]
            future_forecast = forecast[forecast['ds'] > last_date]
            
            # Calcular métricas en conjunto de prueba
            if not test_data.empty:
                test_results = pd.merge(
                    test_data, 
                    test_forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']], 
                    on='ds', 
                    how='left'
                )
                
                rmse = np.sqrt(np.mean((test_results['y'] - test_results['yhat'])**2))
                mae = np.mean(np.abs(test_results['y'] - test_results['yhat']))
                mape = np.mean(np.abs((test_results['y'] - test_results['yhat']) / test_results['y'])) * 100
                
                # Coeficiente de determinación R²
                y_mean = np.mean(test_results['y'])
                ss_total = np.sum((test_results['y'] - y_mean)**2)
                ss_residual = np.sum((test_results['y'] - test_results['yhat'])**2)
                r2 = 1 - (ss_residual / ss_total) if ss_total > 0 else 0
            else:
                rmse, mae, mape, r2 = 0, 0, 0, 0
            
            # Formatear resultados
            result = {
                'train': {
                    'dates': train_data['ds'].dt.strftime('%Y-%m-%d').tolist(),
                    'actual': train_data['y'].tolist(),
                    'fitted': train_forecast['yhat'].tolist(),
                    'lower': train_forecast['yhat_lower'].tolist(),
                    'upper': train_forecast['yhat_upper'].tolist()
                },
                'test': {
                    'dates': test_data['ds'].dt.strftime('%Y-%m-%d').tolist() if not test_data.empty else [],
                    'actual': test_data['y'].tolist() if not test_data.empty else [],
                    'predicted': test_forecast['yhat'].tolist() if not test_forecast.empty else [],
                    'lower': test_forecast['yhat_lower'].tolist() if not test_forecast.empty else [],
                    'upper': test_forecast['yhat_upper'].tolist() if not test_forecast.empty else []
                },
                'forecast': {
                    'dates': future_forecast['ds'].dt.strftime('%Y-%m-%d').tolist(),
                    'predicted': future_forecast['yhat'].tolist(),
                    'lower': future_forecast['yhat_lower'].tolist(),
                    'upper': future_forecast['yhat_upper'].tolist()
                },
                'metrics': {
                    'test': {
                        'rmse': float(rmse),
                        'mae': float(mae),
                        'mape': float(mape),
                        'r2': float(r2)
                    }
                },
                'anomalies': anomalies,
                'components': {
                    'trend': forecast['trend'].tolist(),
                    'yearly': forecast['yearly'].tolist() if 'yearly' in forecast.columns else [],
                    'weekly': forecast['weekly'].tolist() if 'weekly' in forecast.columns else []
                }
            }
            
            # Sanitizar los valores antes de devolverlos
            result = self._sanitize_json_values(result)

            logger.info("Pronóstico generado exitosamente")
            return result
            
        except Exception as e:
            logger.error(f"Error al generar pronóstico: {str(e)}", exc_info=True)
            raise Exception(f"Error en generación de pronóstico: {str(e)}")
        
    def _sanitize_json_values(self, data: Any) -> Any:
        """
        Sanitiza valores no compatibles con JSON (inf, -inf, NaN)
        """
        if isinstance(data, dict):
            return {k: self._sanitize_json_values(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._sanitize_json_values(item) for item in data]
        elif isinstance(data, (float, np.float64, np.float32)):
            # Reemplazar inf, -inf, NaN con None (serán null en JSON)
            if np.isinf(data) or np.isnan(data):
                return None
            return float(data)
        elif isinstance(data, (np.int64, np.int32)):
            return int(data)
        return data