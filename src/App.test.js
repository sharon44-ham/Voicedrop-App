// App smoke test — just checks the app renders without crashing
import { render } from '@testing-library/react';
import App from './App';

jest.mock('socket.io-client', () => {
  return jest.fn(() => ({ on: jest.fn(), emit: jest.fn(), close: jest.fn() }));
});

test('app renders without crashing', () => {
  expect(() => render(<App />)).not.toThrow();
});
