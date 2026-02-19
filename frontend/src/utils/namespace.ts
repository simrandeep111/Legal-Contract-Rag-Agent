export const setNamespace = (namespace: string): void => {
  localStorage.setItem('contractNamespace', namespace);
};

export const getNamespace = (): string | null => {
  return localStorage.getItem('contractNamespace');
};

export const clearNamespace = (): void => {
  localStorage.removeItem('contractNamespace');
};
