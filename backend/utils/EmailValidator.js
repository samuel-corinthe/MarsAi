import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const domains = require('disposable-email-domains');

const disposableSet = new Set(domains);

export function isDisposableEmail(email){
    if(!email || typeof email !== 'string'){
        return{valid: false, reason: 'Email invalide'};
    }

    const domain = email.split('@')[1]?.toLowerCase();

    if(!domain){
        return {valid: false, reason: 'l\'email est  invalide'};
    }

    if(disposableSet.has(domain)){
        return {valid: false, reason: `Ce domaine  de mail n\' est pas autorisé : ${domain}`};
    }
    return {valid: true};
}

export const validateEmail = (req, res, next) =>{
    const email = req.body?.email;
    if(!email){
        return next();
    }

    const result = isDisposableEmail(email);

    if (!result.valid){
        console.warn(`[EMAIL] Domaine rejeté : ${result.reason}`);
        return res.status(400).json({
            error: 'Cette adresse email n\'est pas autorisée',
            message: 'Veuillez utiliser une adresse autorisée'
        });
    }
    next();
}