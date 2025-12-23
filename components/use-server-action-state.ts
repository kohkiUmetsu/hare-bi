'use client';

import * as React from 'react';

export function useServerActionState<State>(
  action: (prevState: State, formData: FormData) => Promise<State> | State,
  initialState: State
): [State, (formData: FormData) => Promise<State>] {
  const [state, setState] = React.useState(initialState);
  const stateRef = React.useRef(state);
  stateRef.current = state;

  const formAction = React.useCallback(
    async (formData: FormData): Promise<State> => {
      const nextState = await action(stateRef.current, formData);
      stateRef.current = nextState;
      setState(nextState);
      return nextState;
    },
    [action]
  );

  return [state, formAction];
}
