import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TimeSeriesChart = ({ data, title }) => {
  if (!data || data.length === 0) return (
    <div className="flex justify-center items-center h-96 bg-gray-100 rounded">
      <p className="text-gray-500">Selecciona una línea y estación para visualizar datos</p>
    </div>
  );

  // Formatear números para visualización
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return new Intl.NumberFormat('es-MX').format(Math.round(num));
  };

  // Procesamiento y validación de datos
  const validData = data.filter(item => 
    item && 
    item.fecha && 
    (item.afluencia !== undefined || item.mean !== undefined)
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="text-sm text-gray-500">
          {validData.length} puntos de datos
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={validData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              dataKey={data[0]?.afluencia !== undefined ? 'afluencia' : 'mean'}
              tick={{ fontSize: 12 }}
              label={{
                value: 'Afluencia Promedio',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
              tickFormatter={formatNumber}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const afluenciaValue = data.afluencia !== undefined ? data.afluencia : data.mean;
                  
                  return (
                    <div className="bg-white p-4 border rounded shadow">
                      <p className="font-bold">{label}</p>
                      <p>Afluencia: {formatNumber(afluenciaValue)}</p>
                      {data.min !== undefined && (
                        <p>Mínimo: {formatNumber(data.min)}</p>
                      )}
                      {data.max !== undefined && (
                        <p>Máximo: {formatNumber(data.max)}</p>
                      )}
                      <p className="mt-2 text-sm text-gray-600">
                        {data.linea} - {data.estacion}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={data[0]?.afluencia !== undefined ? 'afluencia' : 'mean'}
              name="Afluencia"
              stroke="#8884d8"
              dot={false}
              activeDot={{ r: 6 }}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mostrar estadísticas básicas si están disponibles */}
      {data[0]?.min !== undefined && data[0]?.max !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded shadow-sm">
            <h3 className="text-sm font-semibold text-blue-700">Promedio Mensual</h3>
            <p className="text-2xl font-bold">
              {formatNumber(
                validData.reduce((sum, item) => sum + (item.afluencia || item.mean), 0) / validData.length
              )}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded shadow-sm">
            <h3 className="text-sm font-semibold text-green-700">Máximo Mensual</h3>
            <p className="text-2xl font-bold">
              {formatNumber(
                Math.max(...validData.map(item => item.max || item.afluencia || item.mean))
              )}
            </p>
          </div>
          <div className="bg-amber-50 p-4 rounded shadow-sm">
            <h3 className="text-sm font-semibold text-amber-700">Mínimo Mensual</h3>
            <p className="text-2xl font-bold">
              {formatNumber(
                Math.min(...validData.map(item => item.min || item.afluencia || item.mean))
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSeriesChart;