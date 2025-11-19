import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getBrands, adminGetModels, getModelBasedSales, saveModelBasedSalesBulk } from '../services/api';
import type { BrandCategoryKey } from '../lib/brandCategories';
import { formatNumber, parseNumberInput } from '../lib/formatUtils';
import { logger } from '../lib/logger';

type Brand = { id: string; name: string };
type BrandModel = { id: string; brand_id: string; name: string; status: 'aktif' | 'pasif' | 'kayitli' };

interface ModelSalesData {
  modelId: string;
  modelName: string;
  stok: number | null;
  tahsis: number | null;
  baglanti: number | null;
  fatura: number | null;
  faturaBaglanti: number | null;
  hedef: number | null;
}

export default function ModelBasedSalesEntryIsland({ brandCategory = 'satis-markalari' }: { brandCategory?: BrandCategoryKey }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [models, setModels] = useState<BrandModel[]>([]);
  const [modelData, setModelData] = useState<Record<string, ModelSalesData>>({});
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('modelBasedAutoSave');
      return saved !== 'false'; // default true
    } catch {
      return true;
    }
  });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // Load brands
  useEffect(() => {
    const loadBrands = async () => {
      try {
        setError(null);
        const { brands: list } = await getBrands({ brandCategory });
        setBrands(list as Brand[]);
        const savedBrandId = typeof window !== 'undefined' ? localStorage.getItem('selectedBrandId') : null;
        const initialBrandId = savedBrandId && list.find((b: Brand) => String(b.id) === String(savedBrandId))
          ? savedBrandId
          : (list[0]?.id ? String(list[0].id) : '');
        if (initialBrandId) {
          setSelectedBrandId(initialBrandId);
          setSelectedBrand(list.find((b: Brand) => String(b.id) === String(initialBrandId)) || null);
          try { localStorage.setItem('selectedBrandId', initialBrandId); } catch {}
        }
      } catch (e: unknown) {
        logger.error('Markalar yüklenemedi', e);
        setError('Markalar yüklenemedi');
      }
    };
    loadBrands();
  }, [brandCategory]);

  // Generate date string from year and month (first day of month for consistency)
  const getDateString = useCallback((year: number, month: number): string => {
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }, []);

  // Load models and existing sales data when brand, year, or month changes
  useEffect(() => {
    if (!selectedBrandId) {
      setModels([]);
      setModelData({});
      return;
    }

    const loadModelsAndData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load models
        const { models: modelList } = await adminGetModels(selectedBrandId, { status: 'aktif' });
        const activeModels = modelList.filter(m => m.status === 'aktif');
        setModels(activeModels);
        
        // Initialize model data
        const initialData: Record<string, ModelSalesData> = {};
        activeModels.forEach(model => {
          initialData[model.id] = {
            modelId: model.id,
            modelName: model.name,
            stok: null,
            tahsis: null,
            baglanti: null,
            fatura: null,
            faturaBaglanti: null,
            hedef: null,
          };
        });
        
        // Load existing sales data for selected year/month
        try {
          const dateString = getDateString(selectedYear, selectedMonth);
          const existingData = await getModelBasedSales(selectedBrandId, dateString);
          existingData.forEach(item => {
            if (initialData[item.modelId]) {
              initialData[item.modelId] = {
                modelId: item.modelId,
                modelName: item.modelName || initialData[item.modelId].modelName,
                stok: item.stok ?? null,
                tahsis: item.tahsis ?? null,
                baglanti: item.baglanti,
                fatura: item.fatura,
                faturaBaglanti: item.faturaBaglanti,
                hedef: item.hedef,
              };
            }
          });
        } catch (loadError: unknown) {
          // If no existing data, that's fine - just use initial empty data
          logger.debug('Mevcut veri yüklenemedi (yeni kayıt olabilir)', loadError);
        }
        
        setModelData(initialData);
      } catch (e: unknown) {
        logger.error('Modeller yüklenemedi', e);
        setError('Modeller yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    loadModelsAndData();
  }, [selectedBrandId, selectedYear, selectedMonth, getDateString]);

  // Update selected brand when brandId changes
  useEffect(() => {
    const brand = brands.find(b => String(b.id) === String(selectedBrandId));
    setSelectedBrand(brand || null);
  }, [selectedBrandId, brands]);

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    try { localStorage.setItem('selectedBrandId', brandId); } catch {}
  };

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!selectedBrandId || !autoSave || isSavingRef.current) {
      return;
    }

    try {
      isSavingRef.current = true;
      
      // Prepare sales data array
      const salesDataArray = Object.values(modelData).filter(data => 
        data.baglanti !== null || 
        data.fatura !== null || 
        data.faturaBaglanti !== null || 
        data.hedef !== null
      );

      if (salesDataArray.length === 0) {
        isSavingRef.current = false;
        return;
      }

      const dateString = getDateString(selectedYear, selectedMonth);
      // Add date to each sales data item
      const salesDataWithDate = salesDataArray.map(item => ({
        ...item,
        date: dateString,
      }));
      await saveModelBasedSalesBulk(selectedBrandId, dateString, salesDataWithDate);
    } catch (e: unknown) {
      logger.error('Otomatik kayıt hatası', e);
      const error = e as { response?: { data?: { message?: string } }; message?: string };
      setError('Otomatik kayıt başarısız: ' + (error?.response?.data?.message || error?.message || 'Bilinmeyen hata'));
    } finally {
      isSavingRef.current = false;
    }
  }, [selectedBrandId, selectedYear, selectedMonth, modelData, autoSave, getDateString]);

  // Debounced auto-save
  useEffect(() => {
    if (!autoSave || !selectedBrandId) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1 second debounce)
    saveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [modelData, autoSave, selectedBrandId, performAutoSave]);

  // Sync autoSave to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('modelBasedAutoSave', autoSave ? 'true' : 'false');
    } catch {}
  }, [autoSave]);

  const handleModelDataChange = (modelId: string, field: keyof Omit<ModelSalesData, 'modelId' | 'modelName'>, value: string) => {
    setModelData(prev => {
      const currentData = prev[modelId] || {
        modelId,
        modelName: models.find(m => m.id === modelId)?.name || '',
        baglanti: null,
        fatura: null,
        faturaBaglanti: null,
        hedef: null,
      };
      
      // Türkçe format: virgül ondalık ayırıcı, nokta binlik ayırıcı
      let cleanValue = value.replace(/[^\d.,-]/g, ''); // Sadece rakam, virgül, nokta ve eksi işareti
      const lastComma = cleanValue.lastIndexOf(',');
      const lastDot = cleanValue.lastIndexOf('.');
      if (lastComma > lastDot) {
        // Virgül ondalık ayırıcı
        cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
      } else if (lastDot > lastComma) {
        // Nokta ondalık ayırıcı (legacy format)
        const parts = cleanValue.split('.');
        if (parts.length > 1) {
          cleanValue = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
        } else {
          cleanValue = cleanValue.replace(/\./g, '');
        }
      } else {
        cleanValue = cleanValue.replace(/\./g, '');
      }
      const newValue = cleanValue === '' ? null : (parseNumberInput(cleanValue) ?? null);
      
      // Update the field
      const updatedData = {
        ...currentData,
        [field]: newValue,
      };
      
      // If fatura or baglanti changed, and both are now non-null, clear faturaBaglanti (will be auto-calculated)
      if ((field === 'fatura' || field === 'baglanti') && updatedData.fatura !== null && updatedData.baglanti !== null) {
        updatedData.faturaBaglanti = null; // Clear manual value, will be auto-calculated
      }
      
      return {
        ...prev,
        [modelId]: updatedData,
      };
    });
  };

  // Generate years array (current year - 2 to current year + 1)
  const years = Array.from({ length: 4 }, (_, i) => currentDate.getFullYear() - 2 + i);
  const months = [
    { value: 1, label: 'Ocak' },
    { value: 2, label: 'Şubat' },
    { value: 3, label: 'Mart' },
    { value: 4, label: 'Nisan' },
    { value: 5, label: 'Mayıs' },
    { value: 6, label: 'Haziran' },
    { value: 7, label: 'Temmuz' },
    { value: 8, label: 'Ağustos' },
    { value: 9, label: 'Eylül' },
    { value: 10, label: 'Ekim' },
    { value: 11, label: 'Kasım' },
    { value: 12, label: 'Aralık' },
  ];

  const formatInputValue = (value: number | null): string => {
    if (value === null || value === undefined) return '';
    return formatNumber(value);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand Selection */}
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marka Seçimi</label>
              <select
                value={selectedBrandId}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="min-w-[200px] px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Marka Seçin</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>

            {/* Year Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Yıl</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Month Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ay</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto Save Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Otomatik Kayıt</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoSave}
                onChange={() => setAutoSave(v => !v)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
            <span className="text-sm text-gray-600">{autoSave ? 'Açık' : 'Kapalı'}</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Model Sales Table */}
      {selectedBrand && models.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Brand Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
            <h2 className="text-xl font-bold text-white">{selectedBrand.name.toUpperCase()}</h2>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Modeller
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Stok
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Tahsis
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Bağlantı
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Fatura
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Fatura + Bağlantı
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Hedef
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Gerçekleşen %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {models.map((model) => {
                  const data = modelData[model.id] || {
                    modelId: model.id,
                    modelName: model.name,
                    stok: null,
                    tahsis: null,
                    baglanti: null,
                    fatura: null,
                    faturaBaglanti: null,
                    hedef: null,
                  };
                  
                  // Calculate Fatura + Bağlantı
                  // If either fatura or baglanti has a value, calculate the sum (treat null/empty as 0)
                  // Only use manual faturaBaglanti if both fatura and baglanti are null/empty
                  const faturaValue = data.fatura !== null && data.fatura !== undefined && !isNaN(Number(data.fatura)) ? Number(data.fatura) : 0;
                  const baglantiValue = data.baglanti !== null && data.baglanti !== undefined && !isNaN(Number(data.baglanti)) ? Number(data.baglanti) : 0;
                  
                  // Check if both are null/empty (original values, not converted to 0)
                  const bothAreEmpty = (data.fatura === null || data.fatura === undefined || isNaN(Number(data.fatura))) && 
                                      (data.baglanti === null || data.baglanti === undefined || isNaN(Number(data.baglanti)));
                  
                  const hasBothValues = !bothAreEmpty; // At least one has a value
                  
                  const calculatedFaturaBaglanti = hasBothValues
                    ? faturaValue + baglantiValue
                    : (data.faturaBaglanti !== null && data.faturaBaglanti !== undefined && !isNaN(Number(data.faturaBaglanti)) ? Number(data.faturaBaglanti) : null);
                  
                  // Calculate Gerçekleşen % = (Fatura + Bağlantı) / Hedef * 100
                  const gerceklesenYuzde = (() => {
                    const gerceklesen = calculatedFaturaBaglanti !== null ? calculatedFaturaBaglanti : 0;
                    const hedef = data.hedef !== null && data.hedef !== 0 ? data.hedef : null;
                    if (hedef === null || hedef === 0) {
                      return null;
                    }
                    return (gerceklesen / hedef) * 100;
                  })();

                  return (
                    <tr key={model.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                        <span className="text-sm font-medium text-gray-900">{model.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border-r border-gray-200">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatInputValue(data.stok)}
                          onChange={(e) => handleModelDataChange(model.id, 'stok', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-3 py-2 text-sm text-right rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 tabular-nums"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border-r border-gray-200">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatInputValue(data.tahsis)}
                          onChange={(e) => handleModelDataChange(model.id, 'tahsis', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-3 py-2 text-sm text-right rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 tabular-nums"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border-r border-gray-200">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatInputValue(data.baglanti)}
                          onChange={(e) => handleModelDataChange(model.id, 'baglanti', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-3 py-2 text-sm text-right rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 tabular-nums"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border-r border-gray-200">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatInputValue(data.fatura)}
                          onChange={(e) => handleModelDataChange(model.id, 'fatura', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-3 py-2 text-sm text-right rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 tabular-nums"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border-r border-gray-200">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatInputValue(calculatedFaturaBaglanti)}
                          onChange={(e) => {
                            if (!hasBothValues) {
                              handleModelDataChange(model.id, 'faturaBaglanti', e.target.value);
                            }
                          }}
                          onFocus={(e) => {
                            if (!hasBothValues) {
                              e.target.select();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className={`w-full px-3 py-2 text-sm text-right rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 tabular-nums ${
                            hasBothValues ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                          }`}
                          placeholder="0"
                          readOnly={hasBothValues}
                          title={hasBothValues ? 'Fatura ve Bağlantı değerlerinin toplamı (otomatik hesaplanır)' : 'Fatura + Bağlantı değerini girin'}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border-r border-gray-200">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatInputValue(data.hedef)}
                          onChange={(e) => handleModelDataChange(model.id, 'hedef', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-3 py-2 text-sm text-right rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 tabular-nums"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <input
                          type="text"
                          value={gerceklesenYuzde !== null ? `${gerceklesenYuzde.toFixed(2)}%` : ''}
                          readOnly
                          className="w-full px-3 py-2 text-sm text-right rounded border border-gray-200 bg-gray-50 text-gray-700 tabular-nums cursor-not-allowed"
                          placeholder="-"
                          title="Gerçekleşen % = (Fatura + Bağlantı) / Hedef × 100"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedBrandId && !loading && models.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Seçili marka için aktif model bulunamadı.</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Modeller yükleniyor...</p>
        </div>
      )}
    </div>
  );
}

