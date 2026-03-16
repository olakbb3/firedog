import { createContext, useContext, useState, ReactNode } from 'react';

interface OnboardingData {
  training_level: string;
  fitness_goal: string;
  training_frequency: string;
}

interface OnboardingContextType {
  data: OnboardingData;
  setField: (field: keyof OnboardingData, value: string) => void;
  reset: () => void;
}

const defaultData: OnboardingData = { training_level: '', fitness_goal: '', training_frequency: '' };

const OnboardingContext = createContext<OnboardingContextType>({} as OnboardingContextType);

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<OnboardingData>(defaultData);

  const setField = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const reset = () => setData(defaultData);

  return (
    <OnboardingContext.Provider value={{ data, setField, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
};
