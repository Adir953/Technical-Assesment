// La app no usa zone.js (provideZonelessChangeDetection), así que el entorno de pruebas tampoco.
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv();
