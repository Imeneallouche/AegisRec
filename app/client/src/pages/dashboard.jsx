import Sidebar from '../components/sidebar';
import {
  IconEye
  , IconPointer, IconStar
  , IconTrend
} from '../data/icons';


// --- Small helper components ---
function MetricCard({ title, value, change, icon }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex-1 min-w-[200px]">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="text-2xl font-semibold text-slate-800 mt-2">{value}</div>
          <div className={`mt-2 text-sm ${change && change.startsWith('+') ? 'text-emerald-500' : 'text-slate-400'}`}>{change ? `${change} vs mes anterior` : ''}</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-full">
          {icon}
        </div>
      </div>
    </div>
  );
}


export default function Dashboard() {
  const recent = [
    { title: 'Nueva reseña recibida', time: 'Hace 2 horas', color: 'emerald' },
    { title: 'Producto agregado al menú', time: 'Hace 4 horas', color: 'slate' },
    { title: 'Horario actualizado', time: 'Hace 1 día', color: 'slate' },
    { title: 'Promoción activada', time: 'Hace 2 días', color: 'emerald' },
  ];

  const tasks = [
    { title: 'Actualizar fotos del local', priority: 'Alta' },
    { title: 'Revisar información de contacto', priority: 'Media' },
    { title: 'Configurar nuevos métodos de pago', priority: 'Baja' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex">
        <Sidebar activeIndex={0}/>

        <main className="flex-1 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-slate-500">Statistics and General Security Posture</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-500 mr-4">Log out</div>
              <button className="px-4 py-2 bg-slate-900 text-white rounded-lg">GRFICSv3</button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard title="Visualizaciones" value={<span className="text-3xl">1,247</span>} change={'+12%'} icon={<IconEye />} />
            <MetricCard title="Interacciones" value={<span className="text-3xl">89</span>} change={'+8%'} icon={<IconPointer />} />
            <MetricCard title="Calificación" value={<span className="text-3xl">4.7</span>} change={'+0.2'} icon={<IconStar />} />
            <MetricCard title="Conversiones" value={<span className="text-3xl">34</span>} change={'+15%'} icon={<IconTrend />} />
          </div>

          {/* Two column area: Recent Activity + Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Actividad Reciente</h3>
                <button className="text-sm text-slate-500">Ver Todo</button>
              </div>
              <ul className="space-y-4">
                {recent.map((r) => (
                  <li key={r.title} className="flex items-start gap-4">
                    <span className={`mt-1 inline-block w-2 h-2 rounded-full ${r.color === 'emerald' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-slate-400">{r.time}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Tareas Pendientes</h3>
                <div className="text-sm text-slate-400 rounded-full border px-2 py-1">3</div>
              </div>

              <ul className="space-y-4">
                {tasks.map((t) => (
                  <li key={t.title} className="flex justify-between items-center">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 inline-block w-2 h-2 rounded-full ${t.priority === 'Alta' ? 'bg-red-500' : t.priority === 'Media' ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
                      <div>
                        <div className="font-medium">{t.title}</div>
                      </div>
                    </div>
                    <div>
                      <span className={`text-xs px-3 py-1 rounded-full ${t.priority === 'Alta' ? 'bg-red-50 text-red-600' : t.priority === 'Media' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'}`}>{t.priority}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick actions area */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold mb-4">Acciones Rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button className="w-full border border-slate-200 rounded-lg p-4 text-left">Actualizar Horarios</button>
              <button className="w-full border border-slate-200 rounded-lg p-4 text-left">Añadir Producto</button>
              <button className="w-full border border-slate-200 rounded-lg p-4 text-left">Nueva Promoción</button>
              <button className="w-full border border-slate-200 rounded-lg p-4 text-left">Ver Reseñas</button>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
