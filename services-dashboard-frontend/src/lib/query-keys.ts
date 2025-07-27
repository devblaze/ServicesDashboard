export const queryKeys = {
  services: {
    all: ['services'],  // This is an array, not a function
    detail: (id: string) => ['services', id]
  }
};