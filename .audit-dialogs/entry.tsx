import React from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ServiceForm} from './service';
import {CancelOrderDialog} from '/dev-server/src/components/admin/CancelOrderDialog';
import {Dialog,DialogContent,DialogTitle} from '/dev-server/src/components/ui/dialog';
import '/dev-server/src/index.css';
const existing={id:'test', name:'Vinduespolering med ekstra lange servicedetaljer',service_category:'Rengøring',subcategory:'Vinduespolering', description:'Udvendig vinduespolering', pricing_type:'prisberegner',calculator_steps:[{label:'Antal store vinduer',unit:'stk',price_per_unit:25, min_value:1,max_value:100,default_value:10}]};
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}>{location.search.includes('cancel')?<CancelOrderDialog order={{id:'test',payment_status:'credited'}} onClose={()=>{}} onCancel={async()=>{}}/>:<Dialog open><DialogContent className="modal-large flex flex-col overflow-hidden p-0"><DialogTitle className="p-3">Rediger service</DialogTitle><div className="min-h-0 flex-1 overflow-y-auto p-3"><ServiceForm businessId="test" existingService={existing} businessIndustries={['Rengøring']} selectedSubcategoriesByIndustry={{}} onClose={()=>{}}/></div></DialogContent></Dialog>}</QueryClientProvider>);
