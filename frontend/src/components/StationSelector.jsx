import React, { useState, useEffect, useMemo } from 'react';
import { getStations } from '../services/api';

const StationSelector = ({ onStationSelect }) => {
  const [stations, setStations] = useState([]);
  const [selectedLine, setSelectedLine] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar estaciones una vez al inicio
  useEffect(() => {
    const fetchStations = async () => {
      setLoading(true);
      try {
        const stationData = await getStations();
        console.log(`Recibidas ${stationData.length} estaciones del servidor`);
        setStations(stationData);
      } catch (error) {
        console.error('Error al cargar estaciones:', error);
        setError(`Error al cargar estaciones: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  // Calcular líneas únicas usando useMemo para evitar recálculos innecesarios
  const lines = useMemo(() => {
    if (!stations.length) return [];
    console.log('Calculando líneas únicas...');
    
    // Extraer líneas únicas y ordenarlas
    const uniqueLines = [...new Set(stations.map(s => s.linea))].sort();
    console.log(`Se encontraron ${uniqueLines.length} líneas`);
    return uniqueLines;
  }, [stations]);

  // Filtrar estaciones para la línea seleccionada usando useMemo
  const stationsForLine = useMemo(() => {
    if (!selectedLine) return [];
    console.log(`Filtrando estaciones para línea: ${selectedLine}`);
    
    return stations.filter(s => s.linea === selectedLine)
      .sort((a, b) => a.estacion.localeCompare(b.estacion));
  }, [selectedLine, stations]);

  const handleLineChange = (event) => {
    const line = event.target.value;
    console.log('Línea seleccionada:', line);
    setSelectedLine(line);
    setSelectedStation('');
  };

  const handleStationChange = (event) => {
    const station = event.target.value;
    console.log('Estación seleccionada:', station);
    setSelectedStation(station);
    if (station && selectedLine) {
      onStationSelect(selectedLine, station);
    }
  };

  // Renderizar mensaje de carga o error
  if (loading) {
    return (
      <div className="flex flex-col space-y-4 p-4">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          <span>Cargando estaciones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col space-y-4 p-4">
        <div className="bg-red-100 text-red-700 p-3 rounded-md">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Línea</label>
        <select
          value={selectedLine}
          onChange={handleLineChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
        >
          <option value="">Selecciona una línea</option>
          {lines.map((line) => (
            <option key={line} value={line}>{line}</option>
          ))}
        </select>
        <div className="mt-1 text-xs text-gray-500">
          {lines.length} líneas disponibles
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Estación</label>
        <select
          value={selectedStation}
          onChange={handleStationChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
          disabled={!selectedLine}
        >
          <option value="">
            {!selectedLine 
              ? 'Primero selecciona una línea' 
              : stationsForLine.length === 0 
                ? 'No hay estaciones disponibles' 
                : 'Selecciona una estación'}
          </option>
          {stationsForLine.map((station) => (
            <option key={station.estacion} value={station.estacion}>
              {station.estacion}
            </option>
          ))}
        </select>
        {selectedLine && (
          <div className="mt-1 text-xs text-gray-500">
            {stationsForLine.length} estaciones disponibles
          </div>
        )}
      </div>
    </div>
  );
};

export default StationSelector;