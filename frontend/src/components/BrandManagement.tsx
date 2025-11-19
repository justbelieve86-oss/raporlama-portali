import React, { useEffect, useMemo, useState, useRef } from 'react';
import { BrandIcon, EditIcon, TrashIcon, EyeIcon } from './ui/icons';
import { Button } from './ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from './ui/table';
import { Modal, ModalFooter } from './ui/modal';
import clsx from 'clsx';
import type { Brand, BrandModel } from '../services/api';
import { adminGetBrands, adminCreateBrand, adminUpdateBrand, adminDeleteBrand, adminGetModels, adminCreateModel, adminUpdateModel, adminDeleteModel } from '../services/api';
import { filterBrandsByCategory } from '../lib/brandCategories';
import { logger } from '../lib/logger';

type BrandStatus = 'aktif' | 'pasif' | 'kayitli';

// Brand tipi artık services/api.ts’den geliyor

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return iso;
  }
};

interface BrandManagementProps {
  isVisible?: boolean;
}

export default function BrandManagement({ isVisible: propIsVisible = true }: BrandManagementProps = {}) {

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<BrandModel[]>([]);
  const [selectedBrandForModels, setSelectedBrandForModels] = useState<Brand | null>(null);
  const [isComponentVisible, setIsComponentVisible] = useState(propIsVisible);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
  const [isEditModelModalOpen, setIsEditModelModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<BrandModel | null>(null);

  const [newBrand, setNewBrand] = useState<Partial<Brand>>({
    name: '',
    description: '',
    status: 'aktif',
  });

  const [newModel, setNewModel] = useState<Partial<BrandModel>>({
    name: '',
    description: '',
    status: 'aktif',
  });

  const [brandCategory, setBrandCategory] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const brandsAbortControllerRef = useRef<AbortController | null>(null);

  // Check component visibility using Intersection Observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsComponentVisible(entry.isIntersecting && !entry.target.classList.contains('hidden'));
        });
      },
      { threshold: 0.1 }
    );
    
    observer.observe(containerRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    try {
      const urlCat = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('brandCategory') : null;
      const storeCat = typeof window !== 'undefined' ? localStorage.getItem('brandCategory') : null;
      setBrandCategory(urlCat || storeCat || null);
      function onCat(ev: React.ChangeEvent<HTMLSelectElement>) {
        const next = ev?.detail?.brandCategory ?? null;
        setBrandCategory(next);
      }
      window.addEventListener('brandCategory:selected', onCat);
      return () => {
        window.removeEventListener('brandCategory:selected', onCat);
      };
    } catch {
      // Ignore errors, return cleanup function anyway
      return () => {};
    }
  }, []);

  const filteredBrands = useMemo(() => {
    const source = Array.isArray(brands) ? brands.filter(Boolean) : [];
    return filterBrandsByCategory(source, brandCategory || undefined);
  }, [brands, brandCategory]);

  // İstatistik kartları kaldırıldığı için stats hesaplaması da kaldırıldı.

  const openAddModal = () => {
    setNewBrand({ name: '', description: '', status: 'aktif', category_key: brandCategory || '' });
    setIsAddModalOpen(true);
  };

  const handleAddBrand = async () => {
    if (!newBrand.name) return;
    const { brand } = await adminCreateBrand({
      name: newBrand.name!,
      description: newBrand.description || '',
      status: (newBrand.status as BrandStatus) || 'aktif',
      category_key: (newBrand as any).category_key || undefined,
    });
    // Optimistic update
    setBrands((prev) => [brand, ...prev]);
    // Yeni marka eklendiğinde listeyi güncel tut
    // Safety: re-fetch latest list to reflect server state and generated fields
    try {
      const { brands: latest } = await adminGetBrands({ brandCategory: brandCategory || undefined });
      setBrands(latest);
    } catch (e) {
      // If refetch fails, keep optimistic state
      logger.warn('Brand list refresh failed after create', e);
    }
    setIsAddModalOpen(false);
  };

  const openEditModal = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsEditModalOpen(true);
  };

  const handleUpdateBrand = async () => {
    if (!selectedBrand) return;
    const { brand } = await adminUpdateBrand(selectedBrand.id, {
      name: selectedBrand.name,
      description: selectedBrand.description,
      status: selectedBrand.status as BrandStatus,
      category_key: (selectedBrand as any).category_key ? (selectedBrand as any).category_key : undefined,
    });
    setBrands((prev) => prev.map((b) => (b.id === brand.id ? brand : b)));
    setIsEditModalOpen(false);
  };

  const handleDeleteBrand = async (brand: Brand) => {
    await adminDeleteBrand(brand.id);
    setBrands((prev) => prev.filter((b) => b.id !== brand.id));
  };

  // Model functions
  const openAddModelModal = () => {
    setNewModel({ name: '', status: 'aktif' });
    setSelectedBrandForModels(null);
    setModels([]);
    setIsAddModelModalOpen(true);
  };

  const handleAddModel = async () => {
    if (!newModel.name || !selectedBrandForModels) return;
    try {
      const { model } = await adminCreateModel(selectedBrandForModels.id, {
        name: newModel.name!,
        description: '',
        status: (newModel.status as 'aktif' | 'pasif' | 'kayitli') || 'aktif',
      });
      // Seçili markanın modellerini yeniden yükle
      const { models: brandModels } = await adminGetModels(selectedBrandForModels.id);
      setModels(brandModels);
      setNewModel({ name: '', status: 'aktif' });
    } catch (error) {
      logger.error('Model eklenirken hata', error);
    }
  };

  const openEditModelModal = (model: BrandModel) => {
    setSelectedModel(model);
    setIsEditModelModalOpen(true);
  };

  const handleUpdateModel = async () => {
    if (!selectedModel) return;
    try {
      const { model } = await adminUpdateModel(selectedModel.brand_id, selectedModel.id, {
        name: selectedModel.name,
        description: '',
        status: selectedModel.status,
      });
      // Seçili markanın modellerini yeniden yükle
      if (selectedBrandForModels?.id === model.brand_id) {
        const { models: brandModels } = await adminGetModels(model.brand_id);
        setModels(brandModels);
      }
      setIsEditModelModalOpen(false);
      setSelectedModel(null);
    } catch (error) {
      logger.error('Model güncellenirken hata', error);
    }
  };

  const handleDeleteModel = async (model: BrandModel) => {
    try {
      await adminDeleteModel(model.brand_id, model.id);
      // Seçili markanın modellerini yeniden yükle
      if (selectedBrandForModels?.id === model.brand_id) {
        const { models: brandModels } = await adminGetModels(model.brand_id);
        setModels(brandModels);
      } else {
        setModels((prev) => prev.filter((m) => m.id !== model.id));
      }
    } catch (error) {
      logger.error('Model silinirken hata', error);
    }
  };

  // Models are now loaded only when a brand is selected in the modal
  // No automatic loading to prevent rate limiting

  const getStatusBadge = (status: BrandStatus) => {
    const map = {
      aktif: 'bg-green-100 text-green-800',
      pasif: 'bg-yellow-100 text-yellow-800',
      kayitli: 'bg-blue-100 text-blue-800',
    } as const;
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', map[status])}>
        {status.toUpperCase()}
      </span>
    );
  };

  useEffect(() => {
    // Only load if component is visible
    if (!isComponentVisible) {
      return;
    }
    
    // Cancel previous request if any
    if (brandsAbortControllerRef.current) {
      brandsAbortControllerRef.current.abort();
      brandsAbortControllerRef.current = null;
    }
    
    if (loadingRef.current) {
      // Already loading, skip this request
      return;
    }
    
    const load = async () => {
      // Create new AbortController for this request
      const abortController = new AbortController();
      brandsAbortControllerRef.current = abortController;
      
      loadingRef.current = true;
      try {
        // Much longer debounce to prevent rate limiting (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if request was cancelled or component is no longer visible
        if (abortController.signal.aborted || !isComponentVisible) {
          loadingRef.current = false;
          return;
        }
        
        const { brands } = await adminGetBrands({ brandCategory: brandCategory || undefined });
        
        // Check again before setting state
        if (!abortController.signal.aborted && isComponentVisible) {
          setBrands(brands);
        }
      } catch (error: unknown) {
        // Ignore abort errors and 429 errors
        const err = error as { name?: string; response?: { status?: number } };
        if (err?.name === 'AbortError' || err?.response?.status === 429) {
          // If 429, wait longer before retrying
          if (err?.response?.status === 429) {
            logger.warn('Rate limit aşıldı, daha sonra tekrar denenecek');
          }
          return;
        }
        logger.error('Markalar yüklenirken hata', error);
      } finally {
        if (!abortController.signal.aborted) {
          loadingRef.current = false;
        }
        brandsAbortControllerRef.current = null;
      }
    };
    
    // Much longer debounce (2 seconds) to prevent rate limiting
    const timeoutId = setTimeout(() => {
      load();
    }, 2000);
    
    return () => {
      clearTimeout(timeoutId);
      if (brandsAbortControllerRef.current) {
        brandsAbortControllerRef.current.abort();
        brandsAbortControllerRef.current = null;
      }
      // Don't reset loadingRef here - let the request finish or timeout
    };
  }, [brandCategory, isComponentVisible]);

  return (
    <div ref={containerRef} className="bg-gray-50 min-h-screen">
      <div className="px-2 py-4">
        {/* Filtreler kaldırıldı */}

        {/* Brand List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <BrandIcon className="w-5 h-5 mr-2" />
              Marka Listesi
            </h2>
            <div className="flex items-center gap-2">
              <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                + Yeni Marka
              </Button>
              <Button onClick={openAddModelModal} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
                + Model Ekle
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Marka Adı</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand, index) => (
                  <TableRow key={brand?.id ?? `row-${index}`}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md">
                          <BrandIcon className="w-3 h-3 mr-1" />
                          {(brand?.name || '').split(' ')[0] || (brand?.name || '')}
                        </span>
                        <span className="font-medium">{brand?.name || ''}</span>
                      </div>
                    </TableCell>
                    <TableCell>{brand?.description || ''}</TableCell>
                    <TableCell>{getStatusBadge((brand?.status as BrandStatus) || 'aktif')}</TableCell>
                    <TableCell>{formatDate(brand?.created_at || '')}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button className="p-1 text-blue-600 hover:text-blue-800" title="Görüntüle">
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => brand && openEditModal(brand)} className="p-1 text-orange-600 hover:text-orange-800" title="Düzenle">
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => brand && handleDeleteBrand(brand)} className="p-1 text-red-600 hover:text-red-800" title="Sil">
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>{filteredBrands.length} kayıt gösteriliyor</TableCaption>
            </Table>
          </div>
        </div>

      </div>

      {/* Add Model Modal */}
      <Modal isOpen={isAddModelModalOpen} onClose={() => setIsAddModelModalOpen(false)} title="Model Yönetimi">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marka Seçin</label>
            <select
              value={selectedBrandForModels?.id || ''}
              onChange={async (e) => {
                const brand = brands.find((b) => b.id === e.target.value);
                setSelectedBrandForModels(brand || null);
                // Seçili marka değiştiğinde modelleri yükle
                if (brand) {
                  try {
                    const { models: brandModels } = await adminGetModels(brand.id);
                    setModels(brandModels);
                  } catch (error) {
                    logger.error('Modeller yüklenirken hata', error);
                    setModels([]);
                  }
                } else {
                  setModels([]);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Marka seçin...</option>
              {filteredBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          {/* Seçili markanın modelleri */}
          {selectedBrandForModels && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {selectedBrandForModels.name} - Modeller
              </h3>
              {models.filter((m) => m?.brand_id === selectedBrandForModels.id).length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {models
                    .filter((model): model is BrandModel => 
                      model != null && 
                      model.id != null && 
                      model.brand_id === selectedBrandForModels.id
                    )
                    .map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm font-medium text-gray-900">{model.name || 'İsimsiz Model'}</span>
                          {getStatusBadge((model.status as BrandStatus) || 'aktif')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => openEditModelModal(model)}
                            className="p-1 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded"
                            title="Düzenle"
                          >
                            <EditIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteModel(model)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Sil"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Bu marka için henüz model eklenmemiş.</p>
              )}
            </div>
          )}

          {/* Yeni Model Ekleme Formu */}
          {selectedBrandForModels && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Yeni Model Ekle</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model Adı</label>
                  <input
                    type="text"
                    value={newModel.name || ''}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Örn: Corolla, Civic, Passat"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  <select
                    value={(newModel.status as 'aktif' | 'pasif' | 'kayitli') || 'aktif'}
                    onChange={(e) => setNewModel({ ...newModel, status: e.target.value as 'aktif' | 'pasif' | 'kayitli' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="pasif">Pasif</option>
                    <option value="kayitli">Kayıtlı</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <ModalFooter>
            <Button onClick={() => setIsAddModelModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Kapat
            </Button>
            {selectedBrandForModels && (
              <Button
                onClick={handleAddModel}
                disabled={!newModel.name || !selectedBrandForModels}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Ekle
              </Button>
            )}
          </ModalFooter>
        </div>
      </Modal>

      {/* Edit Model Modal */}
      <Modal isOpen={isEditModelModalOpen} onClose={() => setIsEditModelModalOpen(false)} title="Model Düzenle">
        {selectedModel && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Adı</label>
              <input
                type="text"
                value={selectedModel.name}
                onChange={(e) => setSelectedModel({ ...selectedModel, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={selectedModel.status}
                onChange={(e) => setSelectedModel({ ...selectedModel, status: e.target.value as 'aktif' | 'pasif' | 'kayitli' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
                <option value="kayitli">Kayıtlı</option>
              </select>
            </div>
            <ModalFooter>
              <Button onClick={() => setIsEditModelModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                İptal
              </Button>
              <Button onClick={handleUpdateModel} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Güncelle
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* Add Brand Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Marka">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marka Adı</label>
            <input
              type="text"
              value={newBrand.name || ''}
              onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              value={newBrand.description || ''}
              onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select
              value={(newBrand.status as BrandStatus) || 'aktif'}
              onChange={(e) => setNewBrand({ ...newBrand, status: e.target.value as BrandStatus })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="aktif">Aktif</option>
              <option value="pasif">Pasif</option>
              <option value="kayitli">Kayıtlı</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={(newBrand as any).category_key || ''}
              onChange={(e) => setNewBrand({ ...newBrand, category_key: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              <option value="satis-markalari">Satış Markaları</option>
              <option value="kiralama-markalari">Kiralama Markaları</option>
              <option value="ikinci-el-markalari">2.el Markaları</option>
              <option value="ekspertiz-markalari">Ekspertiz Markaları</option>
            </select>
          </div>
          <ModalFooter>
            <Button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">İptal</Button>
            <Button onClick={handleAddBrand} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Ekle</Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Edit Brand Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Marka Düzenle">
        {selectedBrand && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marka Adı</label>
              <input
                type="text"
                value={selectedBrand.name}
                onChange={(e) => setSelectedBrand({ ...selectedBrand, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                value={selectedBrand.description}
                onChange={(e) => setSelectedBrand({ ...selectedBrand, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={selectedBrand.status}
                onChange={(e) => setSelectedBrand({ ...selectedBrand, status: e.target.value as BrandStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
                <option value="kayitli">Kayıtlı</option>
              </select>
            </div>
            <div>
              <label className="block text sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={(selectedBrand as any).category_key || ''}
                onChange={(e) => setSelectedBrand({ ...selectedBrand, category_key: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                <option value="satis-markalari">Satış Markaları</option>
                <option value="kiralama-markalari">Kiralama Markaları</option>
                <option value="ikinci-el-markalari">2.el Markaları</option>
                <option value="ekspertiz-markalari">Ekspertiz Markaları</option>
              </select>
            </div>
            <ModalFooter>
              <Button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">İptal</Button>
              <Button onClick={handleUpdateBrand} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Güncelle</Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
}