export const setting = <T>(key: string) => {
  return {
    get: () => {
      const value = localStorage.getItem(key);
      return value !== null ? (JSON.parse(value) as T) : undefined;
    },
    set: (value: T | undefined) =>
      value === undefined
        ? localStorage.removeItem(key)
        : localStorage.setItem(key, JSON.stringify(value)),
  };
};
export type Setting<T> = ReturnType<typeof setting<T>>;

export const showVisualizer = setting<boolean>("showVisualizer");
export const showProfilePicture = setting<boolean>("showProfilePicture");
export const useDominantColorAsBg = setting<boolean>("useDominantColorAsBg");
export const backgroundColor = setting<string>("backgroundColor");
export const frameRate = setting<number>("frameRate");
