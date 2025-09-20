const getMinutes = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  let hoursWithFraction = (seconds / 3600).toFixed(1);
  if (hoursWithFraction.endsWith(".0")) {
    hoursWithFraction = hoursWithFraction.slice(0, hoursWithFraction.length - 2);
  }

  if (remainingMinutes === 0) {
    return `${hoursWithFraction} hour${hoursWithFraction !== "1" ? "s" : ""}`;
  }

  return `${hours} hour${hours !== 1 ? "s" : ""} and ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`;
};

export default getMinutes;
