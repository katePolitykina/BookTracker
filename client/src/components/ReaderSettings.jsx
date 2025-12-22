import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Slider } from './ui/slider';

const FONTS = [
    'Georgia',
    'Times New Roman',
    'Arial',
    'Helvetica',
    'Verdana',
    'Courier New',
    'Palatino'
];

const PRESET_BACKGROUNDS = [
    { name: 'Белый', value: '#ffffff' },
    { name: 'Бежевый', value: '#f5f5dc' },
    { name: 'Темный', value: '#1a1a1a' }
];

const PRESET_TEXT_COLORS = [
    { name: 'Черный', value: '#000000' },
    { name: 'Темно-серый', value: '#333333' },
    { name: 'Коричневый', value: '#5d4037' }
];

export default function ReaderSettings({ 
    settings, 
    onSettingsChange, 
    onClose,
    chapters,
    onGoToChapter
}) {
    const [localSettings, setLocalSettings] = useState(settings);
    const [selectedChapter, setSelectedChapter] = useState('');

    const handleFontFamilyChange = (e) => {
        const newSettings = { ...localSettings, fontFamily: e.target.value };
        setLocalSettings(newSettings);
        onSettingsChange(newSettings);
    };

    const handleFontSizeChange = (e) => {
        const newSettings = { ...localSettings, fontSize: parseInt(e.target.value) };
        setLocalSettings(newSettings);
        onSettingsChange(newSettings);
    };

    const handleBackgroundColorChange = (e) => {
        const newSettings = { ...localSettings, backgroundColor: e.target.value };
        setLocalSettings(newSettings);
        onSettingsChange(newSettings);
    };

    const handleTextColorChange = (e) => {
        const newSettings = { ...localSettings, textColor: e.target.value };
        setLocalSettings(newSettings);
        onSettingsChange(newSettings);
    };

    const handleSpreadChange = (value) => {
        const newSettings = { ...localSettings, spread: value };
        setLocalSettings(newSettings);
        onSettingsChange(newSettings);
    };

    const handleGoToChapter = async () => {
        if (!selectedChapter) {
            alert('Выберите главу');
            return;
        }

        const chapter = chapters.find(ch => ch.href === selectedChapter);
        if (chapter && onGoToChapter) {
            await onGoToChapter(chapter.href);
            setSelectedChapter('');
            onClose(); // Закрываем модальное окно после перехода
        } else {
            alert('Глава не найдена');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Настройки чтения</h2>
                        <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            ✕
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {/* Шрифт */}
                        <div>
                            <Label htmlFor="fontFamily" className="text-sm font-medium mb-2 block">
                                Шрифт
                            </Label>
                            <Select
                                id="fontFamily"
                                value={localSettings.fontFamily}
                                onChange={handleFontFamilyChange}
                            >
                                {FONTS.map(font => (
                                    <option key={font} value={font}>{font}</option>
                                ))}
                            </Select>
                        </div>

                        {/* Размер шрифта */}
                        <div>
                            <Label htmlFor="fontSize" className="text-sm font-medium mb-2 block">
                                Размер шрифта: {localSettings.fontSize}px
                            </Label>
                            <div className="flex items-center gap-4">
                                <Slider
                                    id="fontSize"
                                    min={12}
                                    max={24}
                                    step={1}
                                    value={localSettings.fontSize}
                                    onChange={(e) => handleFontSizeChange(e)}
                                />
                                <Input
                                    type="number"
                                    min={12}
                                    max={24}
                                    value={localSettings.fontSize}
                                    onChange={(e) => handleFontSizeChange(e)}
                                    className="w-20"
                                />
                            </div>
                        </div>

                        {/* Цвет фона */}
                        <div>
                            <Label htmlFor="backgroundColor" className="text-sm font-medium mb-2 block">
                                Цвет фона
                            </Label>
                            <div className="flex gap-4 items-center">
                                <div className="flex gap-2">
                                    {PRESET_BACKGROUNDS.map(preset => (
                                        <button
                                            key={preset.value}
                                            onClick={() => {
                                                const newSettings = { ...localSettings, backgroundColor: preset.value };
                                                setLocalSettings(newSettings);
                                                onSettingsChange(newSettings);
                                            }}
                                            className={`w-10 h-10 rounded border-2 ${
                                                localSettings.backgroundColor === preset.value
                                                    ? 'border-blue-500'
                                                    : 'border-gray-300'
                                            }`}
                                            style={{ backgroundColor: preset.value }}
                                            title={preset.name}
                                        />
                                    ))}
                                </div>
                                <Input
                                    type="color"
                                    id="backgroundColor"
                                    value={localSettings.backgroundColor}
                                    onChange={handleBackgroundColorChange}
                                    className="w-20 h-10"
                                />
                            </div>
                        </div>

                        {/* Цвет текста */}
                        <div>
                            <Label htmlFor="textColor" className="text-sm font-medium mb-2 block">
                                Цвет текста
                            </Label>
                            <div className="flex gap-4 items-center">
                                <div className="flex gap-2">
                                    {PRESET_TEXT_COLORS.map(preset => (
                                        <button
                                            key={preset.value}
                                            onClick={() => {
                                                const newSettings = { ...localSettings, textColor: preset.value };
                                                setLocalSettings(newSettings);
                                                onSettingsChange(newSettings);
                                            }}
                                            className={`w-10 h-10 rounded border-2 ${
                                                localSettings.textColor === preset.value
                                                    ? 'border-blue-500'
                                                    : 'border-gray-300'
                                            }`}
                                            style={{ backgroundColor: preset.value }}
                                            title={preset.name}
                                        />
                                    ))}
                                </div>
                                <Input
                                    type="color"
                                    id="textColor"
                                    value={localSettings.textColor}
                                    onChange={handleTextColorChange}
                                    className="w-20 h-10"
                                />
                            </div>
                        </div>

                        {/* Режим отображения страниц */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">
                                Режим отображения
                            </Label>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleSpreadChange('none')}
                                    className={`px-4 py-2 rounded-md border-2 transition-colors ${
                                        localSettings.spread === 'none'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                >
                                    1 страница
                                </button>
                                <button
                                    onClick={() => handleSpreadChange('always')}
                                    className={`px-4 py-2 rounded-md border-2 transition-colors ${
                                        localSettings.spread === 'always'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                >
                                    2 страницы
                                </button>
                            </div>
                        </div>

                        {/* Переход к главе */}
                        <div className="border-t pt-4">
                            <Label htmlFor="chapterSelect" className="text-sm font-medium mb-2 block">
                                Перейти к главе
                            </Label>
                            {chapters.length > 0 ? (
                                <div className="flex gap-2 items-center">
                                    <Select
                                        id="chapterSelect"
                                        value={selectedChapter}
                                        onChange={(e) => setSelectedChapter(e.target.value)}
                                        className="flex-1"
                                    >
                                        <option value="">Выберите главу...</option>
                                        {chapters.map((chapter, index) => (
                                            <option key={chapter.id || index} value={chapter.href}>
                                                {chapter.label}
                                            </option>
                                        ))}
                                    </Select>
                                    <Button onClick={handleGoToChapter} disabled={!selectedChapter}>
                                        Перейти
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    Оглавление недоступно для этой книги
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button onClick={onClose}>Закрыть</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

