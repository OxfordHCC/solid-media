import { render } from 'preact';
import { enableMapSet } from 'immer';
import App from './App';

// Enable Map and Set support in Immer
enableMapSet();

const root = document.getElementById('root');
if (root) {
    render(<App />, root);
} else {
    console.error('Root element not found');
}
