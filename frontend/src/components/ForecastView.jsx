import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { getForecast } from '../services/api';

const ForecastView = ({ linea, estacion }) => {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('all'); // 'all', 'train', 'test', 'future'

  const handleForecastClick = async () => {
    if (forecastData) {
      setForecastData(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await getForecast(linea, estacion);
      setForecastData(data);
    } catch (err) {
      console.error('Error al obtener pronóstico:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Preparar datos para la gráfica
  const prepareChartData = () => {
    if (!forecastData) return [];

    const { train, test, forecast } = forecastData;
    
    // Datos de entrenamiento
    const trainData = train.dates.map((date, i) => ({
      fecha: date,
      actual: train.actual[i],
      fitted: train.fitted[i],
      lower: train.lower[i],
      upper: train.upper[i],
      type: 'train'
    }));

    // Datos de test
    const testData = test.dates.map((date, i) => ({
      fecha: date,
      actual: test.actual[i],
      predicted: test.predicted[i],
      lower: test.lower[i],
      upper: test.upper[i],
      type: 'test'
    }));

    // Datos de pronóstico futuro
    const futureData = forecast.dates.map((date, i) => ({
      fecha: date,
      predicted: forecast.predicted[i],
      lower: forecast.lower[i],
      upper: forecast.upper[i],
      type: 'future'
    }));

    // Filtrar según el modo seleccionado
    let filteredData = [];
    if (mode === 'all' || mode === 'train') filteredData.push(...trainData);
    if (mode === 'all' || mode === 'test') filteredData.push(...testData);
    if (mode === 'all' || mode === 'future') filteredData.push(...futureData);

    return filteredData.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  };

  // Detectar anomalías y períodos especiales
  const getAnomalyPeriods = () => {
    if (!forecastData || !forecastData.anomalies) return [];
    
    return forecastData.anomalies.map(anomaly => ({
      start: anomaly.start_date,
      end: anomaly.end_date,
      name: anomaly.name,
      impact: anomaly.impact_percent
    }));
  };

  // Formatear números para visualización
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return new Intl.NumberFormat('es-MX').format(Math.round(num));
  };

  const chartData = prepareChartData();
  const anomalyPeriods = getAnomalyPeriods();

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Pronóstico de Afluencia</h2>
        <button
          onClick={handleForecastClick}
          className={`px-4 py-2 rounded transition-colors ${
            forecastData ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Cargando...
            </span>
          ) : forecastData ? (
            'Ocultar Pronóstico'
          ) : (
            'Generar Pronóstico'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {forecastData && (
        <>
          <div className="bg-gray-100 p-4 rounded-md">
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setMode('all')}
                className={`px-3 py-1 rounded text-sm ${
                  mode === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todo
              </button>
              <button
                onClick={() => setMode('train')}
                className={`px-3 py-1 rounded text-sm ${
                  mode === 'train' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Entrenamiento
              </button>
              <button
                onClick={() => setMode('test')}
                className={`px-3 py-1 rounded text-sm ${
                  mode === 'test' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Validación
              </button>
              <button
                onClick={() => setMode('future')}
                className={`px-3 py-1 rounded text-sm ${
                  mode === 'future' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pronóstico Futuro
              </button>
            </div>
          </div>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="fecha" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                  minTickGap={60}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatNumber}
                  label={{
                    value: 'Afluencia Promedio',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 border rounded shadow">
                          <p className="font-bold">{label}</p>
                          {data.actual !== undefined && (
                            <p>Afluencia real: {formatNumber(data.actual)}</p>
                          )}
                          {data.fitted !== undefined && (
                            <p>Ajuste modelo: {formatNumber(data.fitted)}</p>
                          )}
                          {data.predicted !== undefined && (
                            <p>Predicción: {formatNumber(data.predicted)}</p>
                          )}
                          {data.lower !== undefined && data.upper !== undefined && (
                            <p className="text-sm text-gray-600">
                              Intervalo: {formatNumber(data.lower)} - {formatNumber(data.upper)}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">{data.type === 'train' ? 'Entrenamiento' : data.type === 'test' ? 'Validación' : 'Pronóstico'}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />

                {/* Períodos anómalos como COVID */}
                {anomalyPeriods.map((period, index) => (
                  <ReferenceArea
                    key={`anomaly-${index}`}
                    x1={period.start}
                    x2={period.end}
                    fill="rgba(255, 0, 0, 0.1)"
                    fillOpacity={0.3}
                    label={{
                      position: 'insideTopLeft',
                      value: `${period.name} (-${period.impact}%)`,
                      fontSize: 11,
                      fill: '#d32f2f'
                    }}
                  />
                ))}

                {/* Datos reales */}
                {(mode === 'all' || mode === 'train' || mode === 'test') && (
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#2196f3"
                    dot={false}
                    strokeWidth={2}
                    name="Datos Reales"
                    isAnimationActive={false}
                  />
                )}

                {/* Ajuste en entrenamiento */}
                {(mode === 'all' || mode === 'train') && (
                  <Line
                    type="monotone"
                    dataKey="fitted"
                    stroke="#4caf50"
                    dot={false}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    name="Ajuste Modelo"
                    isAnimationActive={false}
                  />
                )}

                {/* Predicción en test */}
                {(mode === 'all' || mode === 'test') && (
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#ff9800"
                    dot={false}
                    strokeWidth={1.5}
                    name="Predicción Validación"
                    isAnimationActive={false}
                  />
                )}

                {/* Pronóstico futuro */}
                {(mode === 'all' || mode === 'future') && (
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#9c27b0"
                    strokeWidth={2}
                    dot={false}
                    name="Pronóstico Futuro"
                    isAnimationActive={false}
                  />
                )}

                {/* Intervalos de confianza para pronóstico futuro */}
                {mode === 'future' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="lower"
                      stroke="#9c27b0"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      name="Límite Inferior"
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="upper"
                      stroke="#9c27b0"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      name="Límite Superior"
                      isAnimationActive={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Métricas y Análisis */}
          {forecastData.metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-md shadow">
                <h3 className="text-lg font-semibold mb-3">Métricas de Precisión</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-sm text-blue-700">RMSE</div>
                    <div className="text-xl font-bold">{formatNumber(forecastData.metrics.test.rmse)}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-sm text-green-700">MAE</div>
                    <div className="text-xl font-bold">{formatNumber(forecastData.metrics.test.mae)}</div>
                  </div>
                  <div className="bg-amber-50 p-3 rounded">
                    <div className="text-sm text-amber-700">MAPE</div>
                    <div className="text-xl font-bold">{forecastData.metrics.test.mape.toFixed(2)}%</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <div className="text-sm text-purple-700">R²</div>
                    <div className="text-xl font-bold">{forecastData.metrics.test.r2.toFixed(3)}</div>
                  </div>
                </div>
              </div>

              {anomalyPeriods.length > 0 && (
                <div className="bg-white p-4 rounded-md shadow">
                  <h3 className="text-lg font-semibold mb-3">Eventos Detectados</h3>
                  <div className="space-y-3">
                    {anomalyPeriods.map((period, index) => (
                      <div key={`event-${index}`} className="bg-red-50 p-3 rounded">
                        <div className="font-medium text-red-700">{period.name}</div>
                        <div className="text-sm">
                          <span className="font-semibold">Período:</span> {period.start} a {period.end}
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold">Impacto:</span> Reducción del {period.impact}% en afluencia
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ForecastView;