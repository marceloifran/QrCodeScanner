// Definición de planes disponibles
export const SUBSCRIPTION_PLANS = [
  {
    id: "base",
    name: "Plan Base",
    price: 1999, // en pesos argentinos
    priceDisplay: "$1.999",
    productLimit: 300,
    features: [
      "Hasta 300 productos",
      "Escaneo de códigos QR",
      "Gestión de inventario básica",
      "Reportes básicos",
    ],
    color: "#28a745",
    recommended: false,
  },
  {
    id: "standard",
    name: "Plan Estándar",
    price: 3499,
    priceDisplay: "$3.499",
    productLimit: 500,
    features: [
      "Hasta 500 productos",
      "Escaneo de códigos QR",
      "Gestión de inventario avanzada",
      "Reportes detallados",
      "Exportación de datos",
    ],
    color: "#007bff",
    recommended: true,
  },
  {
    id: "premium",
    name: "Plan Premium",
    price: 5999,
    priceDisplay: "$5.999",
    productLimit: Infinity,
    features: [
      "Productos ilimitados",
      "Escaneo de códigos QR",
      "Gestión de inventario avanzada",
      "Reportes detallados y personalizados",
      "Exportación de datos",
      "Soporte prioritario",
      "Funciones exclusivas",
    ],
    color: "#6f42c1",
    recommended: false,
  },
];

// Función para obtener el plan por ID
export const getPlanById = (planId) => {
  // Si planId es undefined o no es un string, usar el plan base
  if (!planId || typeof planId !== "string") {
    return SUBSCRIPTION_PLANS[0];
  }

  const foundPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
  return foundPlan || SUBSCRIPTION_PLANS[0];
};

// Función para verificar si un usuario puede agregar más productos
export const canAddMoreProducts = (currentCount, planId) => {
  const plan = getPlanById(planId);
  return currentCount < plan.productLimit;
};

// Función para obtener el límite de productos para un plan
export const getProductLimit = (planId) => {
  const plan = getPlanById(planId);
  return plan.productLimit;
};

// Función para comparar planes y determinar si uno es superior a otro
export const isPlanHigher = (planId1, planId2) => {
  const planIndex1 = SUBSCRIPTION_PLANS.findIndex(
    (plan) => plan.id === planId1
  );
  const planIndex2 = SUBSCRIPTION_PLANS.findIndex(
    (plan) => plan.id === planId2
  );

  // Si alguno de los planes no existe, devolvemos false
  if (planIndex1 === -1 || planIndex2 === -1) return false;

  // Un índice mayor significa un plan superior
  return planIndex1 > planIndex2;
};

// Función para obtener el siguiente plan superior
export const getNextPlan = (currentPlanId) => {
  const currentIndex = SUBSCRIPTION_PLANS.findIndex(
    (plan) => plan.id === currentPlanId
  );

  // Si es el último plan o no encontramos el plan actual, devolvemos null
  if (currentIndex === -1 || currentIndex === SUBSCRIPTION_PLANS.length - 1) {
    return null;
  }

  // Devolver el siguiente plan
  return SUBSCRIPTION_PLANS[currentIndex + 1];
};

// Función para calcular cuántos productos más puede agregar un usuario
export const getRemainingProducts = (currentCount, planId) => {
  const plan = getPlanById(planId);

  // Si el plan tiene productos ilimitados
  if (plan.productLimit === Infinity) {
    return Infinity;
  }

  // Calcular la diferencia
  const remaining = plan.productLimit - currentCount;
  return remaining > 0 ? remaining : 0;
};

// Función para verificar si un usuario necesita actualizar su plan
export const needsUpgrade = (currentCount, planId) => {
  // Si ya está en el plan premium, no necesita actualizar
  if (planId === "premium") return false;

  const plan = getPlanById(planId);

  // Si está cerca del límite (90% o más), sugerimos actualizar
  return currentCount >= plan.productLimit * 0.9;
};
