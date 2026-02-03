import { useState, useRef } from 'react';
import axios from 'axios';
import { getVideoMetadata, validateVideoFrontend } from '../utils/videoValidation';

export default function YoutubeUpload() {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isValidating, setIsValidating] = useState(false);
    const [errors, setErrors] = useState({});

    const fileInputRef = useRef(null);
    const statusRef = useRef(null);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        try {
            setIsValidating(true);
            setStatus({ type: '', message: '' });
            setErrors(prev => ({ ...prev, file: '' }));

            const metadata = await getVideoMetadata(selectedFile);
            const validation = validateVideoFrontend(metadata);

            if (!validation.isValid) {
                setFile(null);
                const errorMessage = `Vidéo non conforme : ${validation.errors.join(' ')}`;
                setStatus({
                    type: 'error',
                    message: errorMessage
                });
                setErrors(prev => ({ ...prev, file: errorMessage }));
                return;
            }

            setFile(selectedFile);
            setStatus({ type: 'success', message: "Vidéo validée ! Prête pour l'envoi." });

            
            setTimeout(() => {
                statusRef.current?.focus();
            }, 100);

        } catch (err) {
            console.error(err);
            setFile(null);
            const errorMessage = typeof err === 'string' ? err : "Erreur lors de l'analyse du fichier.";
            setStatus({ type: 'error', message: errorMessage });
            setErrors(prev => ({ ...prev, file: errorMessage }));
        } finally {
            setIsValidating(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        
        const newErrors = {};
        if (!email) newErrors.email = "L'email est requis";
        if (!firstName) newErrors.firstName = "Le prénom est requis";
        if (!lastName) newErrors.lastName = "Le nom est requis";
        if (!title) newErrors.title = "Le titre est requis";
        if (!file) newErrors.file = "Veuillez sélectionner une vidéo";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setStatus({ type: 'error', message: 'Veuillez remplir tous les champs obligatoires' });
            return;
        }

        const formData = new FormData();
        formData.append('video', file);
        formData.append('email', email);
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);
        formData.append('title', title);
        formData.append('description', description);

        try {
            setUploading(true);
            setStatus({ type: '', message: '' });

            const res = await axios.post('http://localhost:3000/api/upload/youtube', formData, {
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percent);
                }
            });

            setStatus({ 
                type: 'success', 
                message: `Votre Vidéo a été  mise en ligne avec succès (ID: ${res.data.videoId})` 
            });
            
            setFile(null);
            setEmail('');
            setFirstName('');
            setLastName('');
            setTitle('');
            setDescription('');
            setErrors({});
            
            setTimeout(() => {
                statusRef.current?.focus();
            }, 100);

        } catch (err) {
            console.error(err);
            setStatus({
                type: 'error',
                message: err.response?.data?.error || "Une erreur est survenue lors de l'upload."
            });
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    const clearError = (field) => {
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    return (
        <div className="section app-container py-12">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-slate-900 p-8 text-white">
                    <h1 className="text-3xl font-bold">Concours MarsAI 2026</h1>
                    <p className="text-slate-400 mt-2">Partagez votre vision d'un futur souhaitable.</p>
                </div>

                <form onSubmit={handleUpload} className="p-8 space-y-6" noValidate>
                    {/* Email */}
                    <div className="space-y-2">
                        <label 
                            htmlFor="email-input" 
                            className="block text-sm font-semibold text-slate-700"
                        >
                            Votre Email <abbr title="requis" className="text-red-600 no-underline">*</abbr>
                        </label>
                        <input
                            id="email-input"
                            type="email"
                            placeholder="votre@email.com"
                            className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                                errors.email ? 'border-red-500 bg-red-50' : 'border-slate-200'
                            }`}
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                clearError('email');
                            }}
                            required
                            aria-required="true"
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? "email-error" : "email-hint"}
                        />
                        {errors.email && (
                            <p id="email-error" className="text-red-600 text-sm mt-1" role="alert">
                                {errors.email}
                            </p>
                        )}
                        <span id="email-hint" className="text-xs text-slate-500 block">
                            Nous vous contacterons à cette adresse
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Prénom */}
                        <div className="space-y-2">
                            <label 
                                htmlFor="firstname-input" 
                                className="block text-sm font-semibold text-slate-700"
                            >
                                Votre Prénom <abbr title="requis" className="text-red-600 no-underline">*</abbr>
                            </label>
                            <input
                                id="firstname-input"
                                type="text"
                                placeholder="Votre prénom"
                                className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                                    errors.firstName ? 'border-red-500 bg-red-50' : 'border-slate-200'
                                }`}
                                value={firstName}
                                onChange={(e) => {
                                    setFirstName(e.target.value);
                                    clearError('firstName');
                                }}
                                required
                                aria-required="true"
                                aria-invalid={!!errors.firstName}
                                aria-describedby={errors.firstName ? "firstname-error" : undefined}
                            />
                            {errors.firstName && (
                                <p id="firstname-error" className="text-red-600 text-sm mt-1" role="alert">
                                    {errors.firstName}
                                </p>
                            )}
                        </div>

                        {/* Nom */}
                        <div className="space-y-2">
                            <label 
                                htmlFor="lastname-input" 
                                className="block text-sm font-semibold text-slate-700"
                            >
                                Votre Nom <abbr title="requis" className="text-red-600 no-underline">*</abbr>
                            </label>
                            <input
                                id="lastname-input"
                                type="text"
                                placeholder="Votre nom"
                                className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                                    errors.lastName ? 'border-red-500 bg-red-50' : 'border-slate-200'
                                }`}
                                value={lastName}
                                onChange={(e) => {
                                    setLastName(e.target.value);
                                    clearError('lastName');
                                }}
                                required
                                aria-required="true"
                                aria-invalid={!!errors.lastName}
                                aria-describedby={errors.lastName ? "lastname-error" : undefined}
                            />
                            {errors.lastName && (
                                <p id="lastname-error" className="text-red-600 text-sm mt-1" role="alert">
                                    {errors.lastName}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Titre */}
                    <div className="space-y-2">
                        <label 
                            htmlFor="title-input" 
                            className="block text-sm font-semibold text-slate-700"
                        >
                            Titre de votre film <abbr title="requis" className="text-red-600 no-underline">*</abbr>
                        </label>
                        <input
                            id="title-input"
                            type="text"
                            placeholder="Ex: Ma vie sur Mars"
                            className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                                errors.title ? 'border-red-500 bg-red-50' : 'border-slate-200'
                            }`}
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                clearError('title');
                            }}
                            required
                            aria-required="true"
                            aria-invalid={!!errors.title}
                            aria-describedby={errors.title ? "title-error" : "title-hint"}
                        />
                        {errors.title && (
                            <p id="title-error" className="text-red-600 text-sm mt-1" role="alert">
                                {errors.title}
                            </p>
                        )}
                        <span id="title-hint" className="text-xs text-slate-500 block">
                            Le titre qui apparaîtra sur YouTube et le site du concours
                        </span>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label 
                            htmlFor="description-input" 
                            className="block text-sm font-semibold text-slate-700"
                        >
                            Description <span className="text-slate-500 font-normal">(optionnel)</span>
                        </label>
                        <textarea
                            id="description-input"
                            placeholder="Expliquez brièvement votre projet..."
                            className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 resize-y"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            aria-describedby="description-hint"
                        />
                        <span id="description-hint" className="text-xs text-slate-500 block">
                            Cette description accompagnera votre vidéo sur YouTube
                        </span>
                    </div>

                    {/* Fichier vidéo */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                            Fichier vidéo (MP4 uniquement) <abbr title="requis" className="text-red-600 no-underline">*</abbr>
                        </label>
                        <div className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
                            errors.file ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-blue-400'
                        }`}>
                            <div className="flex flex-col items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isValidating}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    aria-controls="video-upload"
                                    aria-describedby="video-requirements"
                                >
                                    {isValidating ? 'Analyse en cours...' : 'Choisir une vidéo'}
                                </button>
                                <input
                                    id="video-upload"
                                    ref={fileInputRef}
                                    type="file"
                                    accept="video/mp4"
                                    onChange={handleFileChange}
                                    className="sr-only"
                                    aria-label="Sélectionnez votre fichier vidéo MP4"
                                    aria-required="true"
                                    aria-invalid={!!errors.file}
                                    aria-describedby="video-requirements"
                                />
                                {file && (
                                    <p className="text-slate-700 font-medium" aria-live="polite">
                                        📁 {file.name}
                                    </p>
                                )}
                                <p id="video-requirements" className="text-xs text-slate-500 text-center">
                                    Taille max : 300Mo • Format : 16:9 obligatoire • Durée : 45-90 secondes
                                </p>
                            </div>
                        </div>
                        {errors.file && (
                            <p className="text-red-600 text-sm mt-1" role="alert">
                                {errors.file}
                            </p>
                        )}
                    </div>

                    {/* Barre de progression */}
                    {uploading && (
                        <div className="space-y-2" role="region" aria-label="Progression de l'envoi">
                            <div 
                                role="progressbar"
                                aria-valuenow={progress}
                                aria-valuemin="0"
                                aria-valuemax="100"
                                aria-label={`Progression de l'envoi : ${progress} pourcent`}
                                className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"
                            >
                                <div
                                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-sm font-medium text-slate-600 text-center" aria-live="polite">
                                Envoi en cours... {progress}%
                            </p>
                        </div>
                    )}

                    {/* Messages de statut */}
                    {status.message && (
                        <div 
                            ref={statusRef}
                            role="alert"
                            aria-live="polite"
                            aria-atomic="true"
                            tabIndex="-1"
                            className={`p-4 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                status.type === 'success' 
                                    ? 'bg-green-50 text-green-700 border border-green-200 focus:ring-green-500' 
                                    : 'bg-red-50 text-red-700 border border-red-200 focus:ring-red-500'
                            }`}
                        >
                            {status.message}
                        </div>
                    )}

                    {/* Bouton de soumission */}
                    <button
                        type="submit"
                        disabled={uploading || isValidating || !file}
                        aria-busy={uploading || isValidating}
                        aria-disabled={uploading || isValidating || !file}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg active:scale-95 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    >
                        {isValidating ? 'Analyse de la vidéo...' : 
                         uploading ? `Traitement en cours... ${progress}%` : 
                         'Soumettre ma participation'}
                    </button>
                    
                    {/* Aide contextuelle pour le bouton (masquée visuellement) */}
                    {(!file || uploading || isValidating) && (
                        <p className="sr-only" aria-live="polite">
                            {!file ? 'Veuillez d\'abord sélectionner une vidéo pour activer le bouton de soumission' :
                             isValidating ? 'Validation de la vidéo en cours, veuillez patienter' :
                             'Envoi de la vidéo en cours, veuillez patienter'}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}