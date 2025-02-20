import React, { useState, useEffect } from 'react';
import StationSelector from './components/StationSelector';
import TimeSeriesChart from './components/TimeSeriesChart';
import ForecastView from './components/ForecastView';
import { getTimeSeries } from './services/api';

function App() {
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStation, setSelectedStation] = useState({ linea: '', estacion: '' });
  const [showForecast, setShowForecast] = useState(false);

  const handleStationSelect = async (linea, estacion) => {
    setLoading(true);
    setError(null);
    setShowForecast(false);
    
    try {
      const data = await getTimeSeries(linea, estacion);
      setTimeSeriesData(data);
      setSelectedStation({ linea, estacion });
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('No se pudieron cargar los datos. Por favor intenta de nuevo.');
      setTimeSeriesData([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleForecast = () => {
    setShowForecast(!showForecast);
  };

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center my-4">Sistema Metro CDMX - Visualizador de Afluencia</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Selección de Estación</h2>
          <StationSelector onStationSelect={handleStationSelect} />
          
          {selectedStation.linea && selectedStation.estacion && (
            <div className="mt-6">
              <button
                onClick={toggleForecast}
                className={`w-full py-2 px-4 rounded transition-colors ${
                  showForecast 
                    ? 'bg-gray-500 hover:bg-gray-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                {showForecast ? 'Ver Datos Históricos' : 'Ver Pronóstico'}
              </button>
            </div>
          )}
        </div>

        <div className="md:col-span-3 bg-white rounded-lg shadow p-4">
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 text-red-700 p-4 rounded">
              <p>{error}</p>
            </div>
          ) : showForecast ? (
            <ForecastView 
              linea={selectedStation.linea} 
              estacion={selectedStation.estacion} 
            />
          ) : (
            <TimeSeriesChart 
              data={timeSeriesData.data || []} 
              title={selectedStation.linea && selectedStation.estacion 
                ? `Afluencia: ${selectedStation.linea} - ${selectedStation.estacion}`
                : 'Selecciona una estación para ver datos'
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;