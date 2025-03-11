export const formatPrice = (price, decimals = 0) => {
  if (price === undefined || price === null) return '0';
  
  // Convertir a número si es string
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Formatear con el número de decimales especificado
  return numPrice.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}; 