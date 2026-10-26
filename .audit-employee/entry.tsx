import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
const React = await import('react');
const {createRoot} = await import('react-dom/client');
await import('/src/index.css');
const {CompactPricingEditor, defaultPricing} = await import('/src/components/employee/CompactPricingEditor.tsx');
function App() {
 const service = {id:'test', name:'Vinduespolering', unit:'stk', pricing_type:'fast_pris', base_price:600, interval_options:['engangskøb','ugentlig','hver_14_dag']};
 const [value,setValue] = React.useState(defaultPricing(service));
 return <main className="bg-background text-foreground min-h-screen p-4"><div className="mx-auto max-w-lg"><h1 className="mb-4 text-xl font-semibold">Ret aftale</h1><CompactPricingEditor service={service} value={value} onChange={setValue}/></div></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
