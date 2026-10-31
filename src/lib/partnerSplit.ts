import type {Project} from './types';
export type PartnerCode='mina'|'bishoy';
export type SplitMode='percentage'|'amount';
export const roundMoney=(value:number):number=>Math.round((value+Number.EPSILON)*100)/100;
export function splitRatios(project:Pick<Project,'contract_amount'|'split_mode'|'mina_percent'|'bishoy_percent'|'mina_contract_share'|'bishoy_contract_share'>):{mina:number;bishoy:number}{
 const total=Number(project.contract_amount);
 if(project.split_mode==='amount'&&total>0){
  const mina=Number(project.mina_contract_share??total/2);
  const bishoy=Number(project.bishoy_contract_share??total/2);
  if(Number.isFinite(mina)&&Number.isFinite(bishoy)&&Math.abs(mina+bishoy-total)<0.011)return {mina:mina/total,bishoy:bishoy/total};
 }
 const mina=Number(project.mina_percent??50),bishoy=Number(project.bishoy_percent??50);
 if(Number.isFinite(mina)&&Number.isFinite(bishoy)&&mina>=0&&bishoy>=0&&Math.abs(mina+bishoy-100)<0.0001)
  return {mina:mina/100,bishoy:bishoy/100};
 return {mina:.5,bishoy:.5};
}
export function shareAmounts(contract:number,minaPercent:number){
 if(!Number.isFinite(contract)||contract<0||!Number.isFinite(minaPercent)||minaPercent<0||minaPercent>100)throw Error('Invalid contract or partner share');
 const mina=roundMoney(contract*minaPercent/100);
 return {mina,bishoy:roundMoney(contract-mina)};
}
export function validateManualShares(contract:number,mina:number,bishoy:number):boolean{
 return [contract,mina,bishoy].every(Number.isFinite)&&contract>=0&&mina>=0&&bishoy>=0&&Math.abs(mina+bishoy-contract)<0.005;
}
export function partnerNativeShare(project:Project,code:PartnerCode){return roundMoney(Number(project.contract_amount)*splitRatios(project)[code]);}
