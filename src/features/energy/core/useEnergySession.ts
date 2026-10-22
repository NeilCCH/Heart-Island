import { useEffect, useRef, useSyncExternalStore } from 'react';
import { browserRuntime, createEnergyController } from './controller';
import { getGuideView, getRestView } from './machine';
import type { EnergySettings, EnergyEffect, EnergyRuntimeDependencies } from './types';
export function useEnergySession(settings: EnergySettings, options?: { onEffects?: (effects: readonly EnergyEffect[]) => void; dependencies?: EnergyRuntimeDependencies }) {
  const effectsRef = useRef(options?.onEffects); effectsRef.current = options?.onEffects;
  const controllerRef = useRef<ReturnType<typeof createEnergyController> | null>(null);
  if (!controllerRef.current) controllerRef.current = createEnergyController(settings, options?.dependencies ?? browserRuntime(), effects => effectsRef.current?.(effects));
  const controller = controllerRef.current;
  const session = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { controller.connect(); return () => controller.disconnect(); }, [controller]);
  useEffect(() => { controller.setSettings(settings); }, [controller, settings]);
  return { session, guide: getGuideView(session), rest: getRestView(session), actions: controller.actions };
}
