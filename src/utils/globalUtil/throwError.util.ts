export const throwError = (code: number, message: string) => {
  throw {
    status: code,
    message
  };
};
