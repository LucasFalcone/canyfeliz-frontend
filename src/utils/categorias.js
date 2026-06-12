export const CATEGORIAS = [
  { value: 'golosinas', label: '🦴 Golosinas' },
  { value: 'balanceado', label: '🥩 Balanceado' },
  { value: 'alimento_por_peso', label: '⚖️ Alimento por peso' },
  { value: 'farmacia', label: '💊 Farmacia' },
  { value: 'sanitarios', label: '🧴 Sanitarios' },
  { value: 'accesorios', label: '🦮 Accesorios' },
  { value: 'consultorio', label: '🩺 Consultorio' },
  { value: 'cirugias_y_especialidades', label: '🔬 Cirugías y especialidades' },
  { value: 'sin_categoria', label: '📦 Sin categoría' },
]

export const SUBCATEGORIAS = {
  golosinas: [
    { value: 'golocan', label: 'Golocan' },
    { value: 'sieger', label: 'Sieger' },
    { value: 'bruler', label: 'Bruler' },
    { value: 'royal_canin', label: 'Royal Canin' },
    { value: 'fancy_feast', label: 'Fancy Feast' },
    { value: 'pro_plan', label: 'Pro Plan' },
    { value: 'creamy_catit', label: 'Creamy Catit' },

  ],
  balanceado: [
    { value: 'cat_chow', label: 'Cat Chow' }, 
    { value: 'eukanuba', label: 'Eukanuba' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'fawna', label: 'Fawna' },
    { value: 'livra', label: 'Livra' },
    { value: 'royal_canin', label: 'Royal Canin' },
    { value: 'old_prince', label: 'Old Prince' },
    { value: 'pro_plan', label: 'Pro Plan' },
    { value: 'vital_can', label: 'Vital Can' },
  ],
  alimento_por_peso: [
    { value: 'cat_chow', label: 'Cat Chow' }, 
    { value: 'eukanuba', label: 'Eukanuba' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'fawna', label: 'Fawna' },
    { value: 'livra', label: 'Livra' },
    { value: 'royal_canin', label: 'Royal Canin' },
    { value: 'old_prince', label: 'Old Prince' },
    { value: 'pro_plan', label: 'Pro Plan' },
    { value: 'vital_can', label: 'Vital Can' },
  ],
  farmacia: [
    {value:'arandu', label:'Arandu'},
    {value:'muñoz', label:'Muñoz'},
    {value:'nuñez_victor', label:'Nuñez/Victor'},
    {value:'arandu', label:'Arandu'},
    {value:'kronen', label:'Kronen'},

  ],
  sanitarios: [
    {value:'absorsol', label:'Absorsol'},
    {value:'altagama', label:'Altagama'},
    {value:'cancat', label:'Cancat'},
    {value:'nelsoni', label:'Nelsoni'},
    {value:'vital_fun', label:'Vital Fun'},
    {value:'pet', label:'Pet'},
    {value:'Shulet', label:'Shulet'},
  ],
  accesorios: [
    { value: 'caninos', label: 'Caninos' },
    { value: 'rascals', label: 'Rascals' },
    { value: 'kong', label: 'Kong' },
    { value: 'silva', label: 'Silva' },
    { value: 'benji', label: 'Benji' },
    { value: 'rash_on', label: 'Rash On' },
    { value: 'beepaw', label: 'Beepaw' },
    { value: 'agen', label: 'Agen' },
  ],
  cirugias_y_especialidades: [
    { value: 'centrovet', label: 'Centrovet' },
    { value: 'diagnotest', label: 'Diagnotest' },
    { value: 'otra_marca', label: 'Otra marca' },
  ],
}

export const labelCategoria = (value) =>
  CATEGORIAS.find(c => c.value === value)?.label || value

export const labelSubcategoria = (cat, value) =>
  SUBCATEGORIAS[cat]?.find(s => s.value === value)?.label || value

export const tieneSubcategorias = (cat) =>
  !!(SUBCATEGORIAS[cat]?.length)

export const EDADES = ['Cachorro', 'Adulto', 'Senior', 'Todas las edades']

// Etiquetas libres por categoría (el usuario puede crear las suyas)
export const ETIQUETAS_DEFAULT = {
  farmacia: ['Antibiótico', 'Antiparasitario', 'Vitamina', 'Analgésico'],
  balanceado: ['Perro', 'Gato'],
  sanitarios: ['Piedras', 'Belleza', 'Paños', 'Toallitas'],
  accesorios: ['Perro', 'Gato', 'Gato/Perro'],
  cirugias_y_especialidades: ['Cirugía', 'Ecografía', 'Laboratorio', 'Internación'],
  consultorio: ['Consulta', 'Vacuna', 'Control'],
  alimento_por_peso: ['Perro', 'Gato'],
}