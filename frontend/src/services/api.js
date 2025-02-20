const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Maneja la respuesta de la API con mejor gestión de errores
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || `Error ${response.status}: ${response.statusText}`;
    } catch (e) {
      errorMessage = `Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  
  try {
    return await response.json();
  } catch (e) {
    console.error('Error al parsear la respuesta JSON:', e);
    throw new Error('La respuesta del servidor tiene un formato inválido');
  }
};

/**
 * Obtiene la lista de estaciones disponibles
 */
export const getStations = async () => {
  console.log('Solicitando estaciones al endpoint:', `${API_BASE_URL}/stations`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/stations`);
    const data = await handleResponse(response);
    
    console.log('Estaciones recibidas:', data);
    
    if (!Array.isArray(data)) {
      console.error('El formato de respuesta no es un array:', data);
      throw new Error('El servidor devolvió un formato de datos inesperado');
    }
    
    if (data.length === 0) {
      console.warn('Se recibió un array vacío de estaciones');
    }
    
    return data;
  } catch (error) {
    console.error('Error al obtener estaciones:', error);
    throw new Error(`No se pudieron obtener las estaciones: ${error.message}`);
  }
};

/**
 * Obtiene los datos de serie temporal para una estación específica
 */
export const getTimeSeries = async (linea, estacion) => {
  console.log(`Solicitando serie temporal para línea: ${linea}, estación: ${estacion}`);
  
  if (!linea || !estacion) {
    throw new Error('Se requiere especificar línea y estación');
  }
  
  try {
    const url = `${API_BASE_URL}/timeseries/${encodeURIComponent(linea)}/${encodeURIComponent(estacion)}`;
    console.log('URL de solicitud:', url);
    
    const response = await fetch(url);
    const data = await handleResponse(response);
    
    console.log('Serie temporal recibida:', data);
    
    if (!data.data || !Array.isArray(data.data)) {
      console.error('Formato de datos incorrecto:', data);
      throw new Error('El formato de los datos recibidos es inválido');
    }
    
    return data;
  } catch (error) {
    console.error('Error al obtener serie temporal:', error);
    throw new Error(`No se pudo obtener la serie temporal: ${error.message}`);
  }
};

/**
 * Obtiene pronóstico para una estación específica
 */
export const getForecast = async (linea, estacion) => {
  console.log(`Solicitando pronóstico para línea: ${linea}, estación: ${estacion}`);
  
  if (!linea || !estacion) {
    throw new Error('Se requiere especificar línea y estación');
  }
  
  try {
    const url = `${API_BASE_URL}/forecast/${encodeURIComponent(linea)}/${encodeURIComponent(estacion)}`;
    console.log('URL de solicitud de pronóstico:', url);
    
    const response = await fetch(url);
    const data = await handleResponse(response);
    
    console.log('Pronóstico recibido:', data);
    
    if (!data.forecast) {
      console.error('Formato de pronóstico incorrecto:', data);
      throw new Error('El formato del pronóstico recibido es inválido');
    }
    
    return data.forecast;
  } catch (error) {
    console.error('Error al obtener pronóstico:', error);
    throw new Error(`No se pudo obtener el pronóstico: ${error.message}`);
  }
};