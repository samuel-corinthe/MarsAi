import { useState } from 'react';
import axios from 'axios';
import { getVideoMetadata, validateVideoFrontend } from '../utils/videoValidation';

export default function YoutubeUpload() {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isValidating, setIsValidating] = useState(false);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        try {
            setIsValidating(true);
            setStatus({ type: '', message: '' });


            const metadata = await getVideoMetadata(selectedFile);


            const validation = validateVideoFrontend(metadata);

            if (!validation.isValid) {
                setFile(null);
                setStatus({
                    type: 'error',
                    message: `Vidéo non conforme : ${validation.errors.join(' ')}`
                });
                return;
            }


            setFile(selectedFile);
            setStatus({ type: 'success', message: "Vidéo validée ! Prête pour l'envoi." });

        } catch (err) {
            console.error(err);
            setFile(null);
            setStatus({ type: 'error', message: typeof err === 'string' ? err : "Erreur lors de l'analyse du fichier." });
        } finally {
            setIsValidating(false);
        }
    };
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return setStatus({ type: 'error', message: "Veuillez choisir une vidéo !" });

        const formData = new FormData();
        formData.append('video', file);
        formData.append('email', email);
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

            setStatus({ type: 'success', message: `Bravo ! Vidéo mise en ligne avec succès (ID: ${res.data.videoId})` });
            setFile(null);
            setEmail('');
            setTitle('');
            setDescription('');
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

    return (
        <div className="section app-container py-12">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-slate-900 p-8 text-white">
                    <h1 className="text-3xl font-bold">Concours MarsAI 2026</h1>
                    <p className="text-slate-400 mt-2">Partagez votre vision du futur et gagnez des prix incroyables.</p>
                </div>

                <form onSubmit={handleUpload} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Votre Email</label>
                            <input
                                type="email"
                                placeholder="votre@email.com"
                                className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Titre de votre film</label>
                            <input
                                type="text"
                                placeholder="Ex: Ma vie sur Mars"
                                className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Description</label>
                        <textarea
                            placeholder="Expliquez brièvement votre projet..."
                            className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Fichier vidéo (MP4 uniquement)</label>
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                accept="video/mp4"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                            />
                            <div className="space-y-2">
                                <p className="text-slate-600">
                                    {file ? `📁 ${file.name}` : "Cliquez ou glissez votre vidéo ici"}
                                </p>
                                <p className="text-xs text-slate-400">Taille max : 300Mo • Format : 16:9 recommandé</p>
                            </div>
                        </div>
                    </div>

                    {uploading && (
                        <div className="space-y-2">
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-sm font-medium text-slate-600 text-center">Envoi en cours... {progress}%</p>
                        </div>
                    )}

                    {status.message && (
                        <div className={`p-4 rounded-lg text-sm font-medium ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {status.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={uploading || isValidating || !file}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg active:scale-95"
                    >
                        {isValidating ? 'Analyse de la vidéo...' : uploading ? 'Traitement en cours...' : 'Soumettre ma participation'}
                    </button>
                </form>
            </div>
        </div>
    );
}
