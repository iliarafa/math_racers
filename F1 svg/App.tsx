import { F1CarPixelArt } from './components/F1CarPixelArt';

export default function App() {
  return (
    <div className="size-full flex items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-gray-900 text-4xl mb-8 font-mono">Mercedes-AMG F1 W17 - Pixel Art</h1>
        <div className="bg-white p-8 rounded-lg inline-block shadow-md border border-gray-200">
          <F1CarPixelArt />
        </div>
        <p className="text-gray-500 mt-4 font-mono text-sm">Top-down view • Silver Arrows • Arcade racing ready</p>
      </div>
    </div>
  );
}