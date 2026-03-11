// ─── Datos completos de todos los tests de uso libre ──────────────────────────

export interface TestQuestion {
  id: number;
  text: string;
  options: { value: number; label: string }[];
}

export interface PsychTest {
  id: string;
  name: string;
  shortName: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  validated: boolean;
  ageGroup: "adultos" | "niños" | "adolescentes" | "todos";
  questions: TestQuestion[];
  scoring: {
    ranges: { min: number; max: number; level: string; color: string; description: string }[];
    instructions?: string;
  };
}

export const TESTS_DATA: PsychTest[] = [
  // ── PHQ-9 ─────────────────────────────────────────────────────────────────
  {
    id: "phq9", name: "Patient Health Questionnaire – 9", shortName: "PHQ-9",
    category: "Depresión", icon: "🧠", color: "#4A7BA7", validated: true, ageGroup: "adultos",
    description: "Escala de tamizaje para depresión mayor. Ampliamente usado en atención primaria y especializada.",
    questions: [
      { id:1, text:"Poco interés o placer en hacer cosas", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:2, text:"Se ha sentido decaído/a, deprimido/a o sin esperanzas", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:3, text:"Ha tenido dificultad para quedarse o permanecer dormido/a, o ha dormido demasiado", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:4, text:"Se ha sentido cansado/a o con poca energía", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:5, text:"Sin apetito o ha comido en exceso", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:6, text:"Se ha sentido mal consigo mismo/a — o que es un fracaso o que ha quedado mal con usted mismo/a o con su familia", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:7, text:"Ha tenido dificultad para concentrarse en cosas tales como leer el periódico o ver la televisión", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:8, text:"¿Se ha movido o hablado tan lento que otras personas lo han notado? O lo contrario — ha estado tan agitado/a o inquieto/a que se ha estado moviendo mucho más de lo normal", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:9, text:"Pensamientos de que estaría mejor muerto/a o de hacerse daño de alguna manera", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
    ],
    scoring: {
      instructions: "Suma de todos los ítems (0–27)",
      ranges: [
        { min:0,  max:4,  level:"Mínimo",   color:"#5C8A6E", description:"Sin depresión significativa" },
        { min:5,  max:9,  level:"Leve",      color:"#4A7BA7", description:"Depresión leve" },
        { min:10, max:14, level:"Moderado",  color:"#C47B2B", description:"Depresión moderada" },
        { min:15, max:19, level:"Moderado-severo", color:"#B5594A", description:"Depresión moderada-severa" },
        { min:20, max:27, level:"Severo",    color:"#8B2020", description:"Depresión severa" },
      ],
    },
  },

  // ── GAD-7 ─────────────────────────────────────────────────────────────────
  {
    id: "gad7", name: "Generalized Anxiety Disorder – 7", shortName: "GAD-7",
    category: "Ansiedad", icon: "💭", color: "#C47B2B", validated: true, ageGroup: "adultos",
    description: "Instrumento de cribado para el trastorno de ansiedad generalizada con alta sensibilidad y especificidad.",
    questions: [
      { id:1, text:"Se ha sentido nervioso/a, ansioso/a o con los nervios de punta", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:2, text:"No ha podido dejar de preocuparse o no ha podido controlar la preocupación", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:3, text:"Se ha preocupado demasiado por diferentes cosas", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:4, text:"Ha tenido dificultad para relajarse", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:5, text:"Se ha sentido tan inquieto/a que no ha podido quedarse quieto/a", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:6, text:"Se ha molestado o irritado fácilmente", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
      { id:7, text:"Ha sentido miedo de que algo terrible pudiera pasar", options:[{value:0,label:"Para nada"},{value:1,label:"Varios días"},{value:2,label:"Más de la mitad de los días"},{value:3,label:"Casi todos los días"}] },
    ],
    scoring: {
      instructions: "Suma de todos los ítems (0–21)",
      ranges: [
        { min:0,  max:4,  level:"Mínimo",  color:"#5C8A6E", description:"Sin ansiedad significativa" },
        { min:5,  max:9,  level:"Leve",    color:"#4A7BA7", description:"Ansiedad leve" },
        { min:10, max:14, level:"Moderado",color:"#C47B2B", description:"Ansiedad moderada" },
        { min:15, max:21, level:"Severo",  color:"#8B2020", description:"Ansiedad severa" },
      ],
    },
  },

  // ── PCL-5 ─────────────────────────────────────────────────────────────────
  {
    id: "pcl5", name: "PTSD Checklist for DSM-5", shortName: "PCL-5",
    category: "Trauma", icon: "🛡", color: "#5C8A6E", validated: true, ageGroup: "adultos",
    description: "Lista de verificación de síntomas de TEPT basada en criterios DSM-5. Dominio público (Veterans Affairs).",
    questions: [
      { id:1,  text:"Recuerdos repetitivos, perturbadores e involuntarios de la experiencia estresante", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:2,  text:"Sueños perturbadores repetitivos de la experiencia estresante", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:3,  text:"De repente sentirse o actuar como si la experiencia estresante estuviera ocurriendo de nuevo (como si estuviera reviviéndola)", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:4,  text:"Sentirse muy perturbado/a cuando algo le recuerda la experiencia estresante", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:5,  text:"Tener reacciones físicas intensas cuando algo le recuerda la experiencia estresante (por ejemplo, corazón acelerado, dificultad para respirar, sudoración)", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:6,  text:"Evitar recuerdos, pensamientos o sentimientos relacionados con la experiencia estresante", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:7,  text:"Evitar recordatorios externos de la experiencia estresante (personas, lugares, conversaciones, actividades, objetos o situaciones)", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:8,  text:"Dificultad para recordar partes importantes de la experiencia estresante", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:9,  text:"Tener creencias negativas fuertemente arraigadas sobre usted mismo, otras personas o el mundo (por ejemplo, 'Soy malo', 'Hay algo gravemente malo en mí', 'Nadie es de confianza', 'El mundo es completamente peligroso')", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:10, text:"Culparse a usted mismo u otras personas por la experiencia estresante o lo que sucedió después", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:11, text:"Tener sentimientos negativos fuertes como miedo, horror, ira, culpa o vergüenza", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:12, text:"Pérdida de interés en actividades que antes disfrutaba", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:13, text:"Sentirse distante o alejado de otras personas", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:14, text:"Dificultad para experimentar sentimientos positivos (por ejemplo, ser incapaz de sentir felicidad o tener sentimientos de amor hacia personas cercanas a usted)", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:15, text:"Comportamiento irritable, explosiones de ira o actuar agresivamente", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:16, text:"Tomar demasiados riesgos o hacer cosas que podrían causarle daño", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:17, text:"Estar 'superalerta', vigilante o en guardia", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:18, text:"Sentirse jumpy o asustarse fácilmente", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:19, text:"Dificultad para concentrarse", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
      { id:20, text:"Dificultad para conciliar o mantener el sueño", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Moderadamente"},{value:3,label:"Bastante"},{value:4,label:"Extremadamente"}] },
    ],
    scoring: {
      instructions: "Suma de todos los ítems (0–80). Punto de corte sugerido: ≥33",
      ranges: [
        { min:0,  max:20, level:"Mínimo",  color:"#5C8A6E", description:"Sin síntomas significativos de TEPT" },
        { min:21, max:32, level:"Leve",    color:"#4A7BA7", description:"Síntomas leves" },
        { min:33, max:49, level:"Moderado",color:"#C47B2B", description:"Probable TEPT — evaluación clínica recomendada" },
        { min:50, max:80, level:"Severo",  color:"#8B2020", description:"Síntomas severos de TEPT" },
      ],
    },
  },

  // ── AUDIT ─────────────────────────────────────────────────────────────────
  {
    id: "audit", name: "Alcohol Use Disorders Identification Test", shortName: "AUDIT",
    category: "Adicciones", icon: "🔍", color: "#7B6EA8", validated: true, ageGroup: "adultos",
    description: "Test de identificación de trastornos por uso de alcohol desarrollado por la OMS. Dominio público.",
    questions: [
      { id:1, text:"¿Con qué frecuencia consume alguna bebida alcohólica?", options:[{value:0,label:"Nunca"},{value:1,label:"Una o menos veces al mes"},{value:2,label:"De 2 a 4 veces al mes"},{value:3,label:"De 2 a 3 veces a la semana"},{value:4,label:"4 o más veces a la semana"}] },
      { id:2, text:"¿Cuántas consumiciones de bebidas alcohólicas suele realizar en un día de consumo normal?", options:[{value:0,label:"1 o 2"},{value:1,label:"3 o 4"},{value:2,label:"5 o 6"},{value:3,label:"7, 8 o 9"},{value:4,label:"10 o más"}] },
      { id:3, text:"¿Con qué frecuencia toma 6 o más bebidas alcohólicas en un solo día?", options:[{value:0,label:"Nunca"},{value:1,label:"Menos de una vez al mes"},{value:2,label:"Mensualmente"},{value:3,label:"Semanalmente"},{value:4,label:"A diario o casi a diario"}] },
      { id:4, text:"¿Con qué frecuencia en el curso del último año ha sido incapaz de parar de beber una vez que había empezado?", options:[{value:0,label:"Nunca"},{value:1,label:"Menos de una vez al mes"},{value:2,label:"Mensualmente"},{value:3,label:"Semanalmente"},{value:4,label:"A diario o casi a diario"}] },
      { id:5, text:"¿Con qué frecuencia en el curso del último año no pudo hacer lo que se esperaba de usted porque había bebido?", options:[{value:0,label:"Nunca"},{value:1,label:"Menos de una vez al mes"},{value:2,label:"Mensualmente"},{value:3,label:"Semanalmente"},{value:4,label:"A diario o casi a diario"}] },
      { id:6, text:"¿Con qué frecuencia en el curso del último año ha necesitado beber en ayunas para recuperarse después de haber bebido mucho el día anterior?", options:[{value:0,label:"Nunca"},{value:1,label:"Menos de una vez al mes"},{value:2,label:"Mensualmente"},{value:3,label:"Semanalmente"},{value:4,label:"A diario o casi a diario"}] },
      { id:7, text:"¿Con qué frecuencia en el curso del último año ha tenido remordimientos o sentimientos de culpa después de haber bebido?", options:[{value:0,label:"Nunca"},{value:1,label:"Menos de una vez al mes"},{value:2,label:"Mensualmente"},{value:3,label:"Semanalmente"},{value:4,label:"A diario o casi a diario"}] },
      { id:8, text:"¿Con qué frecuencia en el curso del último año no ha podido recordar lo que sucedió la noche anterior porque había estado bebiendo?", options:[{value:0,label:"Nunca"},{value:1,label:"Menos de una vez al mes"},{value:2,label:"Mensualmente"},{value:3,label:"Semanalmente"},{value:4,label:"A diario o casi a diario"}] },
      { id:9, text:"¿Usted o alguna otra persona ha resultado herido porque usted había bebido?", options:[{value:0,label:"No"},{value:2,label:"Sí, pero no en el curso del último año"},{value:4,label:"Sí, el último año"}] },
      { id:10, text:"¿Algún familiar, amigo, médico o profesional sanitario ha mostrado preocupación por su consumo de bebidas alcohólicas o le ha sugerido que deje de beber?", options:[{value:0,label:"No"},{value:2,label:"Sí, pero no en el curso del último año"},{value:4,label:"Sí, el último año"}] },
    ],
    scoring: {
      instructions: "Suma de todos los ítems (0–40)",
      ranges: [
        { min:0,  max:7,  level:"Bajo riesgo",    color:"#5C8A6E", description:"Consumo de bajo riesgo" },
        { min:8,  max:15, level:"Riesgo moderado", color:"#C47B2B", description:"Consumo de riesgo — consejo breve recomendado" },
        { min:16, max:19, level:"Alto riesgo",     color:"#B5594A", description:"Consumo perjudicial — intervención recomendada" },
        { min:20, max:40, level:"Dependencia",     color:"#8B2020", description:"Probable dependencia al alcohol" },
      ],
    },
  },

  // ── CAGE ──────────────────────────────────────────────────────────────────
  {
    id: "cage", name: "CAGE Questionnaire", shortName: "CAGE",
    category: "Adicciones", icon: "🔒", color: "#7B6EA8", validated: true, ageGroup: "adultos",
    description: "Cuestionario de 4 ítems para detección rápida de problemas con el alcohol. Uso libre.",
    questions: [
      { id:1, text:"¿Ha sentido alguna vez que debería beber menos?", options:[{value:0,label:"No"},{value:1,label:"Sí"}] },
      { id:2, text:"¿Le ha molestado que la gente le critique su forma de beber?", options:[{value:0,label:"No"},{value:1,label:"Sí"}] },
      { id:3, text:"¿Se ha sentido alguna vez mal o culpable por su forma de beber?", options:[{value:0,label:"No"},{value:1,label:"Sí"}] },
      { id:4, text:"¿Alguna vez lo primero que ha hecho por la mañana ha sido beber para calmar los nervios o para deshacerse de una resaca?", options:[{value:0,label:"No"},{value:1,label:"Sí"}] },
    ],
    scoring: {
      instructions: "Suma de todos los ítems (0–4). 2 o más respuestas positivas sugieren problema con el alcohol.",
      ranges: [
        { min:0, max:1, level:"Sin indicadores", color:"#5C8A6E", description:"Sin indicadores significativos" },
        { min:2, max:2, level:"Posible problema", color:"#C47B2B", description:"Posible problema con el alcohol — evaluación adicional recomendada" },
        { min:3, max:4, level:"Probable dependencia", color:"#8B2020", description:"Alta probabilidad de dependencia al alcohol" },
      ],
    },
  },

  // ── PSS ───────────────────────────────────────────────────────────────────
  {
    id: "pss10", name: "Perceived Stress Scale – 10", shortName: "PSS-10",
    category: "Estrés", icon: "⚡", color: "#B5594A", validated: true, ageGroup: "adultos",
    description: "Escala de Estrés Percibido de 10 ítems. Mide la percepción subjetiva de estrés en el último mes. Uso libre.",
    questions: [
      { id:1, text:"En el último mes, ¿con qué frecuencia ha estado afectado/a por algo que ha ocurrido inesperadamente?", options:[{value:0,label:"Nunca"},{value:1,label:"Casi nunca"},{value:2,label:"De vez en cuando"},{value:3,label:"A menudo"},{value:4,label:"Muy a menudo"}] },
      { id:2, text:"En el último mes, ¿con qué frecuencia se ha sentido incapaz de controlar las cosas importantes en su vida?", options:[{value:0,label:"Nunca"},{value:1,label:"Casi nunca"},{value:2,label:"De vez en cuando"},{value:3,label:"A menudo"},{value:4,label:"Muy a menudo"}] },
      { id:3, text:"En el último mes, ¿con qué frecuencia se ha sentido nervioso/a o estresado/a?", options:[{value:0,label:"Nunca"},{value:1,label:"Casi nunca"},{value:2,label:"De vez en cuando"},{value:3,label:"A menudo"},{value:4,label:"Muy a menudo"}] },
      { id:4, text:"En el último mes, ¿con qué frecuencia ha manejado con éxito los pequeños problemas irritantes de la vida?", options:[{value:4,label:"Nunca"},{value:3,label:"Casi nunca"},{value:2,label:"De vez en cuando"},{value:1,label:"A menudo"},{value:0,label:"Muy a menudo"}] },
      { id:5, text:"En el último mes, ¿con qué frecuencia ha sentido que ha afrontado efectivamente los cambios importantes que han estado ocurriendo en su vida?", options:[{value:4,label:"Nunca"},{value:3,label:"Casi nunca"},{value:2,label:"De vez en cuando"},{value:1,label:"A menudo"},{value:0,label:"Muy a menudo"}] },
      { id:6, text:"En el último mes, ¿con qué frecuencia ha estado seguro/a sobre su capacidad para manejar sus problemas personales?", options:[{value:4,label:"Nunca"},{value:3,label:"Casi nunca"},{value:2,label:"De vez en cuando"},{value:1,label:"A menudo"},{value:0,label:"Muy a menudo"}] },
      { id:7, text:"En el último mes, ¿con qué frecuencia ha sentido que las cosas le van bien?", options:[{value:4,label:"Nunca"},{value:3,label:"Casi nunca"},{value:2,label:"De vez en cuando"},{value:1,label:"A menudo"},{value:0,label:"Muy a menudo"}] },
      { id:8, text:"En el último mes, ¿con qué frecuencia ha sentido que no podía afrontar todas las cosas que tenía que hacer?", options:[{value:0,label:"Nunca"},{value:1,label:"Casi nunca"},{value:2,label:"De vez en cuando"},{value:3,label:"A menudo"},{value:4,label:"Muy a menudo"}] },
      { id:9, text:"En el último mes, ¿con qué frecuencia ha podido controlar las dificultades de su vida?", options:[{value:4,label:"Nunca"},{value:3,label:"Casi nunca"},{value:2,label:"De vez en cuando"},{value:1,label:"A menudo"},{value:0,label:"Muy a menudo"}] },
      { id:10, text:"En el último mes, ¿con qué frecuencia ha sentido que tenía todo bajo control?", options:[{value:4,label:"Nunca"},{value:3,label:"Casi nunca"},{value:2,label:"De vez en cuando"},{value:1,label:"A menudo"},{value:0,label:"Muy a menudo"}] },
    ],
    scoring: {
      instructions: "Suma de todos los ítems (0–40). Ítems 4,5,6,7,9,10 son inversos.",
      ranges: [
        { min:0,  max:13, level:"Estrés bajo",     color:"#5C8A6E", description:"Nivel de estrés bajo" },
        { min:14, max:26, level:"Estrés moderado",  color:"#C47B2B", description:"Nivel de estrés moderado" },
        { min:27, max:40, level:"Estrés alto",      color:"#8B2020", description:"Nivel de estrés alto" },
      ],
    },
  },

  // ── EPDS ──────────────────────────────────────────────────────────────────
  {
    id: "epds", name: "Edinburgh Postnatal Depression Scale", shortName: "EPDS",
    category: "Depresión perinatal", icon: "👶", color: "#A85E6A", validated: true, ageGroup: "adultos",
    description: "Escala de detección de depresión postparto (y prenatal). 10 ítems. Uso libre — dominio público.",
    questions: [
      { id:1,  text:"He sido capaz de reírme y ver el lado divertido de las cosas", options:[{value:0,label:"Tanto como siempre"},{value:1,label:"No tanto ahora"},{value:2,label:"Mucho menos"},{value:3,label:"No, nada"}] },
      { id:2,  text:"He disfrutado mirar hacia adelante", options:[{value:0,label:"Tanto como siempre"},{value:1,label:"Algo menos de lo que solía hacer"},{value:2,label:"Definitivamente menos"},{value:3,label:"Casi nada"}] },
      { id:3,  text:"Me he culpado sin necesidad cuando las cosas han salido mal", options:[{value:3,label:"Sí, la mayoría de las veces"},{value:2,label:"Sí, a veces"},{value:1,label:"No muy a menudo"},{value:0,label:"No, nunca"}] },
      { id:4,  text:"Me he sentido nerviosa o preocupada sin tener motivo", options:[{value:0,label:"No, para nada"},{value:1,label:"Casi nada"},{value:2,label:"Sí, a veces"},{value:3,label:"Sí, con mucha frecuencia"}] },
      { id:5,  text:"He sentido miedo o he estado asustada sin motivo", options:[{value:3,label:"Sí, bastante"},{value:2,label:"Sí, a veces"},{value:1,label:"No, no mucho"},{value:0,label:"No, nada"}] },
      { id:6,  text:"Las cosas me han agobiado", options:[{value:3,label:"Sí, la mayoría de las veces no he podido manejarlas"},{value:2,label:"Sí, a veces no las he manejado tan bien"},{value:1,label:"No, la mayoría de las veces las he manejado bien"},{value:0,label:"No, he manejado las cosas tan bien como siempre"}] },
      { id:7,  text:"Me he sentido tan infeliz que he tenido dificultad para dormir", options:[{value:3,label:"Sí, la mayoría de las veces"},{value:2,label:"Sí, a veces"},{value:1,label:"No muy a menudo"},{value:0,label:"No, nada"}] },
      { id:8,  text:"Me he sentido triste o desgraciada", options:[{value:3,label:"Sí, la mayoría de las veces"},{value:2,label:"Sí, bastante a menudo"},{value:1,label:"No muy a menudo"},{value:0,label:"No, nada"}] },
      { id:9,  text:"Me he sentido tan infeliz que he estado llorando", options:[{value:3,label:"Sí, la mayoría de las veces"},{value:2,label:"Sí, bastante a menudo"},{value:1,label:"Sólo en ocasiones"},{value:0,label:"No, nunca"}] },
      { id:10, text:"He pensado en hacerme daño a mí misma", options:[{value:3,label:"Sí, bastante a menudo"},{value:2,label:"A veces"},{value:1,label:"Casi nunca"},{value:0,label:"Nunca"}] },
    ],
    scoring: {
      instructions: "Suma de todos los ítems (0–30). Punto de corte ≥10 sugiere depresión.",
      ranges: [
        { min:0,  max:9,  level:"Sin indicadores", color:"#5C8A6E", description:"Sin indicadores de depresión perinatal" },
        { min:10, max:12, level:"Posible depresión", color:"#C47B2B", description:"Posible depresión — seguimiento recomendado" },
        { min:13, max:30, level:"Probable depresión", color:"#8B2020", description:"Probable depresión perinatal — evaluación urgente" },
      ],
    },
  },

  // ── ISI ───────────────────────────────────────────────────────────────────
  {
    id: "isi", name: "Insomnia Severity Index", shortName: "ISI",
    category: "Sueño", icon: "🌙", color: "#4A7BA7", validated: true, ageGroup: "adultos",
    description: "Índice de Severidad del Insomnio. 7 ítems que evalúan la naturaleza, severidad e impacto del insomnio. Uso libre.",
    questions: [
      { id:1, text:"Dificultad para conciliar el sueño", options:[{value:0,label:"Ninguna"},{value:1,label:"Leve"},{value:2,label:"Moderada"},{value:3,label:"Severa"},{value:4,label:"Muy severa"}] },
      { id:2, text:"Dificultad para mantener el sueño", options:[{value:0,label:"Ninguna"},{value:1,label:"Leve"},{value:2,label:"Moderada"},{value:3,label:"Severa"},{value:4,label:"Muy severa"}] },
      { id:3, text:"Problemas de despertar demasiado temprano", options:[{value:0,label:"Ninguna"},{value:1,label:"Leve"},{value:2,label:"Moderada"},{value:3,label:"Severa"},{value:4,label:"Muy severa"}] },
      { id:4, text:"¿Cuán satisfecho/a está con su patrón de sueño actual?", options:[{value:0,label:"Muy satisfecho/a"},{value:1,label:"Satisfecho/a"},{value:2,label:"Neutral"},{value:3,label:"Insatisfecho/a"},{value:4,label:"Muy insatisfecho/a"}] },
      { id:5, text:"¿En qué medida considera que su problema de sueño interfiere con su funcionamiento diario (fatiga, concentración, memoria, estado de ánimo)?", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Algo"},{value:3,label:"Mucho"},{value:4,label:"Extremadamente"}] },
      { id:6, text:"¿En qué medida cree que su problema de sueño es visible para los demás en términos de deterioro de su calidad de vida?", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Algo"},{value:3,label:"Mucho"},{value:4,label:"Extremadamente"}] },
      { id:7, text:"¿Cuán preocupado/a está por su problema de sueño?", options:[{value:0,label:"Para nada"},{value:1,label:"Un poco"},{value:2,label:"Algo"},{value:3,label:"Mucho"},{value:4,label:"Extremadamente"}] },
    ],
    scoring: {
      instructions: "Suma de todos los ítems (0–28)",
      ranges: [
        { min:0,  max:7,  level:"Sin insomnio clínico", color:"#5C8A6E", description:"Sin insomnio clínicamente significativo" },
        { min:8,  max:14, level:"Insomnio subclínico",  color:"#4A7BA7", description:"Insomnio subclínico — umbral" },
        { min:15, max:21, level:"Insomnio moderado",    color:"#C47B2B", description:"Insomnio clínico moderado" },
        { min:22, max:28, level:"Insomnio severo",      color:"#8B2020", description:"Insomnio clínico severo" },
      ],
    },
  },

  // ── SCARED (niños/adolescentes) ───────────────────────────────────────────
  {
    id: "scared5", name: "Screen for Child Anxiety – 5 ítems", shortName: "SCARED-5",
    category: "Ansiedad infantil", icon: "🧒", color: "#6A9E8A", validated: true, ageGroup: "niños",
    description: "Versión abreviada del SCARED para detección de ansiedad en niños y adolescentes (8–18 años). Uso libre.",
    questions: [
      { id:1, text:"Cuando me asusto, me cuesta respirar", options:[{value:0,label:"No es verdad o casi nunca"},{value:1,label:"A veces es verdad"},{value:2,label:"Muy verdad o a menudo"}] },
      { id:2, text:"Me da miedo ir al colegio", options:[{value:0,label:"No es verdad o casi nunca"},{value:1,label:"A veces es verdad"},{value:2,label:"Muy verdad o a menudo"}] },
      { id:3, text:"Me preocupa que algo malo le pase a mis padres", options:[{value:0,label:"No es verdad o casi nunca"},{value:1,label:"A veces es verdad"},{value:2,label:"Muy verdad o a menudo"}] },
      { id:4, text:"Me preocupan las cosas del colegio", options:[{value:0,label:"No es verdad o casi nunca"},{value:1,label:"A veces es verdad"},{value:2,label:"Muy verdad o a menudo"}] },
      { id:5, text:"No me gusta estar con personas que no conozco", options:[{value:0,label:"No es verdad o casi nunca"},{value:1,label:"A veces es verdad"},{value:2,label:"Muy verdad o a menudo"}] },
    ],
    scoring: {
      instructions: "Suma de todos los ítems (0–10). Punto de corte ≥3",
      ranges: [
        { min:0, max:2, level:"Sin indicadores",  color:"#5C8A6E", description:"Sin indicadores significativos de ansiedad" },
        { min:3, max:10, level:"Posible ansiedad", color:"#C47B2B", description:"Posible trastorno de ansiedad — evaluación recomendada" },
      ],
    },
  },
];

export const CATEGORIES = [
  "Todos", "Depresión", "Ansiedad", "Trauma", "Adicciones",
  "Estrés", "Depresión perinatal", "Sueño", "Ansiedad infantil", "Personalizado"
];

export function calcScore(testId: string, answers: Record<number, number>): { score: number; level: string; color: string; description: string } {
  const test = TESTS_DATA.find(t => t.id === testId);
  if (!test) return { score: 0, level: "—", color: "#A8A29E", description: "—" };
  const score = Object.values(answers).reduce((a, b) => a + b, 0);
  const range = test.scoring.ranges.find(r => score >= r.min && score <= r.max);
  return { score, level: range?.level ?? "—", color: range?.color ?? "#A8A29E", description: range?.description ?? "—" };
}

export function getMaxScore(testId: string): number {
  const test = TESTS_DATA.find(t => t.id === testId);
  if (!test) return 0;
  return test.scoring.ranges[test.scoring.ranges.length - 1]?.max ?? 0;
}