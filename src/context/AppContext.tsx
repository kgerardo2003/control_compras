import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  UserProfile,
  PurchaseRecord, 
  AttachedDocument,
  Catalog, 
  AuditLogEntry, 
  AppNotification, 
  ActiveTab, 
  UserRole,
  AuditAction,
  CatalogItem,
  SystemThemeId,
  CustomLogoConfig,
  ToastItem,
  GmailConfig,
  StatusTimelineEvent,
  TimelineEventState,
  BudgetLineItem,
  BudgetModification,
  PurchaseChangeLogEntry
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_USER_PROFILES,
  INITIAL_CATALOGS, 
  INITIAL_PURCHASES, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_NOTIFICATIONS 
} from '../data/initialData';
import { 
  INITIAL_BUDGET_LINES, 
  INITIAL_BUDGET_MODIFICATIONS 
} from '../data/initialBudgetData';
import { calculateBudgetAvailability } from '../utils/budgetCalculations';
import { SYSTEM_THEMES, ThemeConfig } from '../utils/themeConfig';
import { ensureValidDocument } from '../utils/documentUtils';
import { buildUserWelcomeEmail } from '../utils/userEmailTemplate';
import { 
  createAutomaticTimelineEvent, 
  detectAutomaticEventsOnUpdate, 
  getPurchaseTimeline 
} from '../utils/timelineUtils';
import { 
  db,
  PURCHASES_COLLECTION, 
  AUDIT_LOGS_COLLECTION, 
  CATALOGS_COLLECTION, 
  USERS_COLLECTION,
  savePurchaseToFirestore,
  saveBatchPurchasesToFirestore,
  removePurchaseFromFirestore,
  removeBatchPurchasesFromFirestore,
  saveAuditLogToFirestore,
  saveCatalogToFirestore,
  removeCatalogFromFirestore,
  saveUserToFirestore,
  removeUserFromFirestore,
  saveUserProfileToFirestore,
  deleteUserProfileFromFirestore,
  onUserProfilesSnapshot,
  seedInitialDataIfEmpty,
  forceFetchPurchasesFromServer,
  saveBudgetLineToFirestore,
  saveBatchBudgetLinesToFirestore,
  removeBudgetLineFromFirestore,
  saveBudgetModificationToFirestore,
  removeBudgetModificationFromFirestore,
  onBudgetLinesSnapshot,
  onBudgetModificationsSnapshot
} from '../lib/firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { saveAttachmentToIndexedDB, getAttachmentFromIndexedDB, getAttachmentWithDataUrl } from '../utils/attachmentStorage';

export const DEFAULT_LOGO_CONFIG: CustomLogoConfig = {
  type: 'custom_image',
  imageUrl: '/organismo_judicial_logo.svg',
  presetId: 'oj_vector',
  title: 'Organismo Judicial',
  subtitle: 'Gerencia de Informática'
};

interface AppContextType {
  currentUser: User | null;
  users: User[];
  purchases: PurchaseRecord[];
  catalogs: Catalog[];
  auditLogs: AuditLogEntry[];
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOnline: boolean;
  isFirestoreConnected: boolean;
  firestoreStatus: 'conectado' | 'conectando' | 'offline';
  refreshPurchases: () => Promise<void>;
  selectedPurchase: PurchaseRecord | null;
  setSelectedPurchase: (purchase: PurchaseRecord | null) => void;
  isPurchaseModalOpen: boolean;
  setIsPurchaseModalOpen: (open: boolean) => void;
  purchaseToEdit: PurchaseRecord | null;
  setPurchaseToEdit: (purchase: PurchaseRecord | null) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  isChangePasswordModalOpen: boolean;
  setIsChangePasswordModalOpen: (open: boolean) => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;

  // Temas y Personalización
  theme: SystemThemeId;
  setTheme: (theme: SystemThemeId) => void;
  themeConfig: ThemeConfig;
  customLogo: CustomLogoConfig;
  setCustomLogo: (logo: CustomLogoConfig | ((prev: CustomLogoConfig) => CustomLogoConfig)) => void;
  resetLogo: () => void;
  
  // Auth
  login: (username: string, password?: string) => { success: boolean; message: string };
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => { success: boolean; message: string };
  switchDemoUser: (role: UserRole) => void;

  // Compras CRUD
  addPurchase: (data: Omit<PurchaseRecord, 'id' | 'creadoPor' | 'fechaCreacion'>) => PurchaseRecord;
  importPurchases: (records: Omit<PurchaseRecord, 'id' | 'creadoPor' | 'fechaCreacion'>[], replaceAll?: boolean) => Promise<{ count: number }>;
  updatePurchase: (id: string, data: Partial<PurchaseRecord>) => void;
  recordPurchaseMilestone: (
    purchaseId: string, 
    milestone: {
      titulo: string;
      fase?: string;
      responsable?: string;
      observaciones?: string;
      documentoReferencia?: string;
      estado?: TimelineEventState;
      nuevoEstatus?: string;
      additionalFields?: Partial<PurchaseRecord>;
    }
  ) => void;
  deletePurchase: (id: string) => void;
  deletePurchases: (ids: string[]) => Promise<{ count: number }>;

  // Catálogos CRUD
  addCatalog: (data: Omit<Catalog, 'id' | 'esSistema'>) => Catalog;
  updateCatalog: (id: string, data: Partial<Catalog>) => void;
  deleteCatalog: (id: string) => void;
  addCatalogItem: (catalogId: string, item: Omit<CatalogItem, 'id'>) => void;
  updateCatalogItem: (catalogId: string, itemId: string, item: Partial<CatalogItem>) => void;
  deleteCatalogItem: (catalogId: string, itemId: string) => void;

  // Usuarios CRUD
  addUser: (data: Omit<User, 'id' | 'fechaCreacion'>) => User;
  updateUser: (id: string, data: Partial<User>) => void;
  toggleUserStatus: (id: string) => void;
  deleteUser: (id: string) => void;

  // Perfiles de Usuario y Permisos de Acceso a Módulos
  userProfiles: UserProfile[];
  addUserProfile: (data: Omit<UserProfile, 'id' | 'esSistema' | 'fechaCreacion'>) => UserProfile;
  updateUserProfile: (id: string, data: Partial<UserProfile>) => void;
  deleteUserProfile: (id: string) => void;
  hasModuleAccess: (tab: ActiveTab) => boolean;
  getUserProfile: (user?: User | null) => UserProfile | undefined;

  // Auditoría
  logAudit: (
    accion: AuditAction, 
    modulo: AuditLogEntry['modulo'], 
    detalles: string, 
    registroId?: string,
    valoresAnteriores?: Record<string, any>, 
    valoresNuevos?: Record<string, any>
  ) => void;

  // Notificaciones
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => void;
  triggerSimulatedNotification: () => void;

  // Sistema de Notificaciones Flotantes (Toasts)
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;

  // Reseteo
  resetToDemoData: () => void;

  // Configuración de Correo Electrónico (Gmail)
  gmailConfig: GmailConfig;
  updateGmailConfig: (config: Partial<GmailConfig>) => void;
  testGmailConnection: (testRecipient: string, overrideConfig?: Partial<GmailConfig>) => Promise<{ success: boolean; message: string }>;
  sendEmailNotification: (params: { to?: string[]; subject: string; html?: string; text?: string }) => Promise<{ success: boolean; message?: string }>;
  sendUserWelcomeEmail: (user: { username: string; email: string; nombreCompleto?: string; rol?: string }, tempPassword?: string) => Promise<{ success: boolean; message: string }>;

  // MÓDULO FINANCIERO Y PRESUPUESTARIO
  budgetLines: BudgetLineItem[];
  budgetModifications: BudgetModification[];
  budgetAvailability: BudgetLineItem[];
  addBudgetLine: (data: Omit<BudgetLineItem, 'id' | 'fechaCreacion'>) => BudgetLineItem;
  updateBudgetLine: (id: string, data: Partial<BudgetLineItem>) => void;
  deleteBudgetLine: (id: string) => void;
  importBudgetLines: (lines: Omit<BudgetLineItem, 'id' | 'fechaCreacion'>[], replaceAll?: boolean) => Promise<{ count: number }>;
  addBudgetModification: (mod: Omit<BudgetModification, 'id' | 'correlativo' | 'fechaCreacion'>) => BudgetModification;
  updateBudgetModification: (id: string, data: Partial<BudgetModification>) => void;
  deleteBudgetModification: (id: string) => void;
  approveBudgetModification: (id: string) => void;
  rejectBudgetModification: (id: string) => void;
  togglePurchasePaymentState: (purchaseId: string) => void;
  addPurchaseBitacoraEntry: (purchaseId: string, entry: Omit<PurchaseChangeLogEntry, 'id' | 'fechaHora' | 'usuario'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'oj_git_users_v1',
  USER_PROFILES: 'oj_git_user_profiles_v1',
  PURCHASES: 'oj_git_purchases_v1',
  CATALOGS: 'oj_git_catalogs_v1',
  AUDIT_LOGS: 'oj_git_audit_v1',
  NOTIFICATIONS: 'oj_git_notifs_v1',
  SESSION: 'oj_git_session_v1',
  THEME: 'oj_git_theme_v1',
  LOGO: 'oj_git_logo_v1',
  GMAIL: 'oj_git_gmail_v1',
  BUDGET_LINES: 'oj_git_budget_lines_v1',
  BUDGET_MODIFICATIONS: 'oj_git_budget_mods_v1',
};

export const DEFAULT_GMAIL_CONFIG: GmailConfig = {
  userEmail: 'kgerardo2003@gmail.com',
  senderName: 'Sistema de Control de Compras - GIT OJ',
  appPassword: 'pwwv bgmb wgak bvdn',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  secure: true,
  recipientEmails: ['kgerardo2003@gmail.com', 'klopez@oj.gob.gt'],
  notifyOnNewPurchase: true,
  notifyOnAdjudication: true,
  notifyOnDeadlineWarning: true,
  notifyOnGitOpinion: true,
  notifyOnCriticalAudit: false,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicialización con persistencia en localStorage
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        const adminIndex = parsed.findIndex(u => u.username.toLowerCase() === 'admin');
        if (adminIndex >= 0) {
          parsed[adminIndex].nombreCompleto = 'Lic. Kevin Gerardo López de León';
          parsed[adminIndex].email = 'klopez@oj.gob.gt';
          parsed[adminIndex].password = parsed[adminIndex].password || 'Guate2026*';
          parsed[adminIndex].rol = 'administrador';
          parsed[adminIndex].cargo = 'Gerente de Informática';
          parsed[adminIndex].departamento = 'Gerencia de Informática - OJ';
          parsed[adminIndex].activo = true;
          return parsed;
        } else {
          return [INITIAL_USERS[0], ...parsed];
        }
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILES);
    if (saved) {
      try {
        const parsed: UserProfile[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn("Error leyendo userProfiles de localStorage:", e);
      }
    }
    return INITIAL_USER_PROFILES;
  });

  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PURCHASES);
    if (saved) {
      try {
        const parsed: PurchaseRecord[] = JSON.parse(saved);
        return parsed.map(p => {
          let rec = { ...p };
          if (!rec.areaSolicitante) {
            const initialMatch = INITIAL_PURCHASES.find(ip => ip.id === rec.id);
            rec.areaSolicitante = initialMatch?.areaSolicitante || 'Soporte técnico';
          }
          if (rec.f56Documento) {
            rec.f56Documento = ensureValidDocument(rec.f56Documento, rec);
          }
          return rec;
        });
      } catch {
        return INITIAL_PURCHASES;
      }
    }
    return INITIAL_PURCHASES;
  });

  const [catalogs, setCatalogs] = useState<Catalog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CATALOGS);
    if (saved) {
      try {
        const parsed: Catalog[] = JSON.parse(saved);
        const hasAreaCat = parsed.some(c => c.codigo === 'AREA_SOLICITANTE');
        if (!hasAreaCat) {
          const areaCat = INITIAL_CATALOGS.find(c => c.codigo === 'AREA_SOLICITANTE');
          if (areaCat) {
            return [...parsed, areaCat];
          }
        }
        return parsed;
      } catch {
        return INITIAL_CATALOGS;
      }
    }
    return INITIAL_CATALOGS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.map((n: AppNotification, idx: number) => {
            if (!n.id || seen.has(n.id)) {
              const uniqueId = `notif-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
              seen.add(uniqueId);
              return { ...n, id: uniqueId };
            }
            seen.add(n.id);
            return n;
          });
        }
      } catch {
        return INITIAL_NOTIFICATIONS;
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [budgetLines, setBudgetLines] = useState<BudgetLineItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BUDGET_LINES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const has113 = parsed.some((l: BudgetLineItem) => l.renglonPresupuestario === '113');
          if (!has113) {
            const initial113 = INITIAL_BUDGET_LINES.find(l => l.renglonPresupuestario === '113');
            if (initial113) {
              return [initial113, ...parsed];
            }
          }
          return parsed;
        }
      } catch (e) {
        console.warn("Error leyendo budgetLines de localStorage:", e);
      }
    }
    return INITIAL_BUDGET_LINES;
  });

  const [budgetModifications, setBudgetModifications] = useState<BudgetModification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BUDGET_MODIFICATIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn("Error leyendo budgetModifications de localStorage:", e);
      }
    }
    return INITIAL_BUDGET_MODIFICATIONS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const sessionActive = sessionStorage.getItem('OJ_SESSION_ACTIVE');
    if (sessionActive) {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.username && parsed.username.toLowerCase() === 'admin') {
            parsed.nombreCompleto = 'Lic. Kevin Gerardo López de León';
            parsed.email = 'klopez@oj.gob.gt';
            parsed.password = parsed.password || 'Guate2026*';
            parsed.cargo = 'Gerente de Informática';
            parsed.departamento = 'Gerencia de Informática - OJ';
          }
          return parsed;
        } catch {
          return null;
        }
      }
    }
    return null; // Inicia en el panel de logueo al ingresar al sistema
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [firestoreStatus, setFirestoreStatus] = useState<'conectado' | 'conectando' | 'offline'>('conectando');
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<PurchaseRecord | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Sincronización en Tiempo Real Multiusuario con Firebase Firestore
  useEffect(() => {
    // Sembrado inicial de contingencia si la base de datos en la nube está limpia
    seedInitialDataIfEmpty(INITIAL_PURCHASES, INITIAL_CATALOGS, INITIAL_USERS, INITIAL_AUDIT_LOGS)
      .then(() => {
        setIsFirestoreConnected(true);
        setFirestoreStatus('conectado');
      })
      .catch((err) => {
        console.warn("Conexión Firestore:", err);
      });

    // Suscripción reactiva a Adquisiciones (Purchases)
    let unsubPurchases: (() => void) | undefined;
    try {
      unsubPurchases = onSnapshot(collection(db, PURCHASES_COLLECTION), { includeMetadataChanges: true }, (snapshot) => {
        const remoteItems: PurchaseRecord[] = [];
        snapshot.forEach((doc) => {
          const item = doc.data() as PurchaseRecord;
          if (item.f56Documento) {
            item.f56Documento = ensureValidDocument(item.f56Documento, item);
          }
          remoteItems.push(item);
        });
        remoteItems.sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''));
        if (remoteItems.length > 0 || snapshot.metadata.fromCache === false) {
          setPurchases(prevPurchases => {
            const prevMap = new Map<string, PurchaseRecord>(prevPurchases.map(p => [p.id, p]));
            return remoteItems.map(item => {
              const prevItem = prevMap.get(item.id);
              // Si el registro local en memoria ya contiene el documento con su dataUrl completo,
              // preservarlo íntegro para evitar que la sincronización de metadatos de Firestore lo sobreescriba.
              if (item.f56Documento && prevItem?.f56Documento?.dataUrl) {
                if (!item.f56Documento.dataUrl || item.f56Documento.dataUrl.length < prevItem.f56Documento.dataUrl.length) {
                  return {
                    ...item,
                    f56Documento: {
                      ...item.f56Documento,
                      dataUrl: prevItem.f56Documento.dataUrl,
                      nombre: item.f56Documento.nombre || prevItem.f56Documento.nombre,
                      tamano: item.f56Documento.tamano || prevItem.f56Documento.tamano,
                      tipo: item.f56Documento.tipo || prevItem.f56Documento.tipo,
                      fechaSubida: item.f56Documento.fechaSubida || prevItem.f56Documento.fechaSubida
                    }
                  };
                }
              }
              return item;
            });
          });
        }
        setIsFirestoreConnected(true);
        setFirestoreStatus('conectado');
      }, (error) => {
        console.warn("Firestore Purchases Listener Error:", error);
        setFirestoreStatus('offline');
      });
    } catch (err) {
      console.warn("No se pudo iniciar listener de compras:", err);
    }

    // Suscripción reactiva a Bitácora Oficial (Audit Logs)
    let unsubLogs: (() => void) | undefined;
    try {
      const qLogs = query(collection(db, AUDIT_LOGS_COLLECTION), limit(250));
      unsubLogs = onSnapshot(qLogs, { includeMetadataChanges: true }, (snapshot) => {
        const remoteLogs: AuditLogEntry[] = [];
        snapshot.forEach((doc) => {
          remoteLogs.push(doc.data() as AuditLogEntry);
        });
        remoteLogs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        if (remoteLogs.length > 0 || snapshot.metadata.fromCache === false) {
          setAuditLogs(remoteLogs);
        }
      }, (error) => {
        console.warn("Firestore Logs Listener Error:", error);
      });
    } catch (err) {
      console.warn("No se pudo iniciar listener de bitácora:", err);
    }

    // Suscripción reactiva a Catálogos Parametrizados
    let unsubCatalogs: (() => void) | undefined;
    try {
      unsubCatalogs = onSnapshot(collection(db, CATALOGS_COLLECTION), { includeMetadataChanges: true }, (snapshot) => {
        if (!snapshot.empty) {
          const remoteCatalogs: Catalog[] = [];
          snapshot.forEach((doc) => {
            remoteCatalogs.push(doc.data() as Catalog);
          });
          setCatalogs(remoteCatalogs);
        }
      }, (error) => {
        console.warn("Firestore Catalogs Listener Error:", error);
      });
    } catch (err) {
      console.warn("No se pudo iniciar listener de catálogos:", err);
    }

    // Suscripción reactiva a Directorio de Usuarios
    let unsubUsers: (() => void) | undefined;
    try {
      unsubUsers = onSnapshot(collection(db, USERS_COLLECTION), { includeMetadataChanges: true }, (snapshot) => {
        if (!snapshot.empty) {
          const remoteUsers: User[] = [];
          snapshot.forEach((doc) => {
            remoteUsers.push(doc.data() as User);
          });
          setUsers(remoteUsers);
        }
      }, (error) => {
        console.warn("Firestore Users Listener Error:", error);
      });
    } catch (err) {
      console.warn("No se pudo iniciar listener de usuarios:", err);
    }

    // Suscripción reactiva a Renglones Presupuestarios (Budget Lines)
    let unsubBudgetLines: (() => void) | undefined;
    try {
      unsubBudgetLines = onBudgetLinesSnapshot((cloudLines) => {
        if (cloudLines && cloudLines.length > 0) {
          setBudgetLines(cloudLines);
          localStorage.setItem(STORAGE_KEYS.BUDGET_LINES, JSON.stringify(cloudLines));
        }
      });
    } catch (err) {
      console.warn("No se pudo iniciar listener de renglones presupuestarios:", err);
    }

    // Suscripción reactiva a Modificaciones Presupuestarias
    let unsubBudgetMods: (() => void) | undefined;
    try {
      unsubBudgetMods = onBudgetModificationsSnapshot((cloudMods) => {
        if (cloudMods && cloudMods.length > 0) {
          setBudgetModifications(cloudMods);
          localStorage.setItem(STORAGE_KEYS.BUDGET_MODIFICATIONS, JSON.stringify(cloudMods));
        }
      });
    } catch (err) {
      console.warn("No se pudo iniciar listener de modificaciones presupuestarias:", err);
    }

    // Suscripción reactiva a Perfiles de Usuario
    let unsubUserProfiles: (() => void) | undefined;
    try {
      unsubUserProfiles = onUserProfilesSnapshot((cloudProfiles) => {
        if (cloudProfiles && cloudProfiles.length > 0) {
          setUserProfiles(cloudProfiles);
          localStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(cloudProfiles));
        }
      });
    } catch (err) {
      console.warn("No se pudo iniciar listener de perfiles de usuario:", err);
    }

    return () => {
      if (unsubPurchases) unsubPurchases();
      if (unsubLogs) unsubLogs();
      if (unsubCatalogs) unsubCatalogs();
      if (unsubUsers) unsubUsers();
      if (unsubBudgetLines) unsubBudgetLines();
      if (unsubBudgetMods) unsubBudgetMods();
      if (unsubUserProfiles) unsubUserProfiles();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(userProfiles));
  }, [userProfiles]);

  // Hidratación reactiva de documentos adjuntos desde IndexedDB o subcolección de Firestore
  useEffect(() => {
    const unhydrated = purchases.filter(p => 
      p.f56Documento && 
      (!p.f56Documento.dataUrl || p.f56Documento.dataUrl.length < 100)
    );
    if (unhydrated.length === 0) return;

    let isMounted = true;
    const hydrateDocs = async () => {
      const updatedDocs: { id: string; doc: AttachedDocument }[] = [];

      for (const p of unhydrated) {
        if (!isMounted) break;
        try {
          const fullDoc = await getAttachmentWithDataUrl(p.id, p.f56Documento);
          if (fullDoc?.dataUrl && fullDoc.dataUrl.length > 100) {
            updatedDocs.push({ id: p.id, doc: fullDoc });
          }
        } catch (e) {
          // Continuar con el siguiente registro
        }
      }

      if (isMounted && updatedDocs.length > 0) {
        setPurchases(prev => prev.map(p => {
          const match = updatedDocs.find(u => u.id === p.id);
          return match ? { ...p, f56Documento: match.doc } : p;
        }));
        setSelectedPurchase(curr => {
          if (!curr) return null;
          const match = updatedDocs.find(u => u.id === curr.id);
          return match ? { ...curr, f56Documento: match.doc } : curr;
        });
      }
    };

    hydrateDocs();

    return () => {
      isMounted = false;
    };
  }, [purchases.length]);

  const refreshPurchases = useCallback(async () => {
    try {
      setFirestoreStatus('conectando');
      const serverItems = await forceFetchPurchasesFromServer();
      if (serverItems && serverItems.length > 0) {
        setPurchases(serverItems);
      }
      setIsFirestoreConnected(true);
      setFirestoreStatus('conectado');
    } catch (err) {
      console.warn("Error refrescando compras desde Firestore:", err);
      setFirestoreStatus('offline');
    }
  }, []);

  // Tema del sistema
  const [theme, setThemeState] = useState<SystemThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved && (saved === 'azul_persia_acero' || saved === 'slate_ambar' || saved === 'azul_judicial' || saved === 'grafito_esmeralda')) {
      if (saved === 'slate_ambar') {
        localStorage.setItem(STORAGE_KEYS.THEME, 'azul_persia_acero');
        return 'azul_persia_acero';
      }
      return saved as SystemThemeId;
    }
    return 'azul_persia_acero';
  });

  const themeConfig = SYSTEM_THEMES[theme] || SYSTEM_THEMES.azul_persia_acero;

  const setTheme = (newTheme: SystemThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    addNotification({
      tipo: 'info',
      titulo: 'Tema Visual Actualizado',
      mensaje: `Se ha aplicado el tema "${SYSTEM_THEMES[newTheme]?.name}".`,
      categoria: 'sistema'
    });
  };

  // Logotipo personalizado
  const [customLogo, setCustomLogoState] = useState<CustomLogoConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGO);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.presetId === 'oj_vector' || (parsed.type === 'preset' && !parsed.imageUrl) || !parsed.imageUrl) {
          return {
            ...parsed,
            type: 'custom_image',
            imageUrl: '/organismo_judicial_logo.svg',
            presetId: 'oj_vector'
          };
        }
        return parsed;
      } catch {
        return DEFAULT_LOGO_CONFIG;
      }
    }
    return DEFAULT_LOGO_CONFIG;
  });

  const setCustomLogo = (updater: CustomLogoConfig | ((prev: CustomLogoConfig) => CustomLogoConfig)) => {
    setCustomLogoState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(STORAGE_KEYS.LOGO, JSON.stringify(next));
      return next;
    });
  };

  const resetLogo = () => {
    setCustomLogoState(DEFAULT_LOGO_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.LOGO);
    addNotification({
      tipo: 'info',
      titulo: 'Logotipo Restablecido',
      mensaje: 'Se ha restaurado el logotipo oficial del Organismo Judicial.',
      categoria: 'sistema'
    });
  };

  // Configuración de Correo Gmail & Alertas
  const [gmailConfig, setGmailConfig] = useState<GmailConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GMAIL);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Autocorrección de email sin .com o contraseñas vacías previas
        if (parsed.userEmail && (parsed.userEmail.endsWith('@gmail') || parsed.userEmail === 'kgerardo2003@gmail')) {
          parsed.userEmail = 'kgerardo2003@gmail.com';
        }
        if (!parsed.appPassword || parsed.appPassword === '') {
          parsed.appPassword = 'pwwv bgmb wgak bvdn';
        }
        return { ...DEFAULT_GMAIL_CONFIG, ...parsed };
      } catch {
        return DEFAULT_GMAIL_CONFIG;
      }
    }
    return DEFAULT_GMAIL_CONFIG;
  });

  const updateGmailConfig = useCallback((newConfig: Partial<GmailConfig>) => {
    setGmailConfig(prev => {
      const updated = { ...prev, ...newConfig };
      if (updated.userEmail && (updated.userEmail.endsWith('@gmail') || updated.userEmail.endsWith('@gmail.'))) {
        updated.userEmail = updated.userEmail.replace(/@gmail\.?$/, '@gmail.com');
      }
      if (updated.appPassword) {
        updated.appPassword = updated.appPassword.replace(/["']/g, '').trim();
      }
      localStorage.setItem(STORAGE_KEYS.GMAIL, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const testGmailConnection = useCallback(async (
    testRecipient: string,
    overrideConfig?: Partial<GmailConfig>
  ): Promise<{ success: boolean; message: string }> => {
    const active = { ...gmailConfig, ...overrideConfig };
    
    // Normalizar correo y contraseña
    if (active.userEmail && (active.userEmail.endsWith('@gmail') || active.userEmail.endsWith('@gmail.'))) {
      active.userEmail = active.userEmail.replace(/@gmail\.?$/, '@gmail.com');
    }
    if (active.appPassword) {
      active.appPassword = active.appPassword.replace(/["']/g, '').trim();
    }

    if (!active.userEmail || !active.userEmail.includes('@')) {
      return { 
        success: false, 
        message: 'La cuenta de correo remitente de Gmail no es válida. Verifique que incluya "@gmail.com".' 
      };
    }
    if (!active.appPassword || active.appPassword.trim().length < 8) {
      return { 
        success: false, 
        message: 'Debe ingresar una Contraseña de Aplicación de Google válida (16 caracteres).' 
      };
    }

    let recipient = testRecipient.trim();
    if (recipient.endsWith('@gmail') || recipient.endsWith('@gmail.')) {
      recipient = recipient.replace(/@gmail\.?$/, '@gmail.com');
    }

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: active.userEmail,
          appPassword: active.appPassword,
          smtpHost: active.smtpHost,
          smtpPort: active.smtpPort,
          secure: active.secure,
          senderName: active.senderName,
          testRecipient: recipient,
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (res.ok && data?.success) {
        const updated: GmailConfig = {
          ...active,
          lastTestDate: new Date().toISOString(),
          lastTestStatus: 'success',
          lastTestError: undefined,
        };
        setGmailConfig(updated);
        localStorage.setItem(STORAGE_KEYS.GMAIL, JSON.stringify(updated));
        return { 
          success: true, 
          message: data.message || `Prueba de conexión con Gmail exitosa. Se ha despachado el correo de prueba a ${recipient}.` 
        };
      } else {
        let errorMsg = data?.message;
        if (!errorMsg) {
          if (res.status === 405) {
            errorMsg = 'Error HTTP 405 (Método no permitido). Verifique que la función /api/email/test esté disponible en Vercel.';
          } else if (res.status === 404) {
            errorMsg = 'Error HTTP 404: El endpoint /api/email/test no fue encontrado en el servidor.';
          } else if (rawText && (rawText.includes('<!DOCTYPE') || rawText.includes('<html'))) {
            errorMsg = `El servidor devolvió una página HTML en lugar de JSON (HTTP ${res.status}). En Vercel verifique que la carpeta /api esté en su repositorio de GitHub.`;
          } else {
            errorMsg = `Error del servidor de correo (${res.status}): ${rawText ? rawText.slice(0, 150) : 'Sin respuesta'}`;
          }
        }

        const updated: GmailConfig = {
          ...active,
          lastTestDate: new Date().toISOString(),
          lastTestStatus: 'error',
          lastTestError: errorMsg,
        };
        setGmailConfig(updated);
        localStorage.setItem(STORAGE_KEYS.GMAIL, JSON.stringify(updated));
        return { success: false, message: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Error de conexión con el backend de correo.';
      return { success: false, message: errorMsg };
    }
  }, [gmailConfig]);

  const sendEmailNotification = useCallback(async (params: {
    to?: string[];
    subject: string;
    html?: string;
    text?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const recipients = params.to && params.to.length > 0 ? params.to : gmailConfig.recipientEmails;
    if (!recipients || recipients.length === 0) {
      return { success: false, message: 'No hay destinatarios de correo configurados.' };
    }
    
    // Normalizar credenciales con fallback seguro
    const userEmail = (gmailConfig.userEmail && gmailConfig.userEmail.trim()) || 'kgerardo2003@gmail.com';
    const appPassword = (gmailConfig.appPassword && gmailConfig.appPassword.trim()) || 'pwwv bgmb wgak bvdn';

    if (!userEmail || !appPassword) {
      return { success: false, message: 'Credenciales de Gmail incompletas.' };
    }

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          appPassword,
          smtpHost: gmailConfig.smtpHost || 'smtp.gmail.com',
          smtpPort: gmailConfig.smtpPort || 465,
          secure: gmailConfig.secure !== undefined ? gmailConfig.secure : true,
          senderName: gmailConfig.senderName || 'Sistema de Control de Compras - GIT OJ',
          to: recipients,
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      });
      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }
      return { 
        success: res.ok && Boolean(data?.success), 
        message: data?.message || (res.ok ? 'Notificación enviada' : `Error en servidor (${res.status})`) 
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error de conexión' };
    }
  }, [gmailConfig]);

  // Sistema de Notificaciones Flotantes (Toast)
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = {
      ...toast,
      id,
    };
    setToasts(prev => [newToast, ...prev.slice(0, 3)]);
    return id;
  }, []);

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    try {
      // Para evitar que localStorage exceda la cuota del navegador (5MB), guardamos las compras
      // manteniendo los metadatos del documento y preservando el archivo binario pesado en IndexedDB
      const lightweightPurchases = purchases.map(p => {
        if (p.f56Documento?.dataUrl && p.f56Documento.dataUrl.length > 50000) {
          return {
            ...p,
            f56Documento: {
              nombre: p.f56Documento.nombre,
              tamano: p.f56Documento.tamano,
              tipo: p.f56Documento.tipo,
              fechaSubida: p.f56Documento.fechaSubida,
              storageKey: p.f56Documento.storageKey || 'indexeddb'
            }
          };
        }
        return p;
      });
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(lightweightPurchases));
    } catch (err) {
      console.warn("Aviso al guardar compras en localStorage (cuota protegida por IndexedDB):", err);
    }
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATALOGS, JSON.stringify(catalogs));
  }, [catalogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  }, [currentUser]);

  // Auditoría Helper
  const logAudit = useCallback((
    accion: AuditAction, 
    modulo: AuditLogEntry['modulo'], 
    detalles: string, 
    registroId?: string,
    valoresAnteriores?: Record<string, any>, 
    valoresNuevos?: Record<string, any>
  ) => {
    const newEntry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fecha: new Date().toISOString(),
      usuario: currentUser ? `${currentUser.username} (${currentUser.nombreCompleto})` : 'Sistema Anónimo',
      rol: currentUser ? currentUser.rol : 'usuario_estandar',
      accion,
      modulo,
      detalles,
      registroId,
      ip: '10.150.2.' + (Math.floor(Math.random() * 80) + 10),
      valoresAnteriores,
      valoresNuevos
    };

    setAuditLogs(prev => [newEntry, ...prev]);
    saveAuditLogToFirestore(newEntry);
  }, [currentUser]);

  // Helper de Notificación
  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'fecha' | 'leida'>) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${uniqueSuffix}`,
      fecha: new Date().toISOString(),
      leida: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  // Notificación oficial por correo al crear usuario
  const sendUserWelcomeEmail = useCallback(async (
    user: { username: string; email: string; nombreCompleto?: string; rol?: string },
    tempPassword: string = 'Guate2026*'
  ): Promise<{ success: boolean; message: string }> => {
    const targetEmail = user.email ? user.email.trim() : '';
    if (!targetEmail || !targetEmail.includes('@')) {
      return { 
        success: false, 
        message: `El usuario @${user.username} no posee una dirección de correo institucional válida.` 
      };
    }

    const { subject, text, html } = buildUserWelcomeEmail({
      username: user.username,
      temporaryPassword: tempPassword,
      nombreCompleto: user.nombreCompleto,
      rol: user.rol,
    });

    const result = await sendEmailNotification({
      to: [targetEmail],
      subject,
      text,
      html,
    });

    if (result.success) {
      logAudit(
        'SISTEMA',
        'Usuarios',
        `Notificación de credenciales enviada exitosamente por correo a @${user.username} (${targetEmail}) con contraseña temporal.`,
        undefined,
        undefined,
        { destinatario: targetEmail, usuario: user.username }
      );
    }

    return {
      success: result.success,
      message: result.message || (result.success 
        ? `Notificación de credenciales enviada exitosamente a ${targetEmail}` 
        : `No se pudo despachar el correo a ${targetEmail}`)
    };
  }, [sendEmailNotification, logAudit]);

  // Login
  const login = (username: string, password?: string) => {
    const trimmedUser = username.toLowerCase().trim();
    const user = users.find(u => u.username.toLowerCase() === trimmedUser);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado en los registros del Organismo Judicial.' };
    }
    if (!user.activo) {
      return { success: false, message: 'La cuenta de usuario se encuentra suspendida o inactiva.' };
    }

    const expectedPassword = user.password || (user.username.toLowerCase() === 'admin' ? 'Guate2026*' : 'user123');
    if (password && expectedPassword && password !== expectedPassword) {
      return { success: false, message: 'Contraseña institucional incorrecta.' };
    }

    const updatedUser = { 
      ...user, 
      nombreCompleto: user.username.toLowerCase() === 'admin' ? 'Lic. Kevin Gerardo López de León' : user.nombreCompleto,
      email: user.username.toLowerCase() === 'admin' ? 'klopez@oj.gob.gt' : user.email,
      password: expectedPassword,
      ultimoAcceso: new Date().toISOString() 
    };
    sessionStorage.setItem('OJ_SESSION_ACTIVE', 'true');
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    setActiveTab('dashboard');
    
    // Registrar auditoría
    const tempLog: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fecha: new Date().toISOString(),
      usuario: `${updatedUser.username} (${updatedUser.nombreCompleto})`,
      rol: updatedUser.rol,
      accion: 'LOGIN',
      modulo: 'Autenticación',
      detalles: `Inicio de sesión exitoso como ${updatedUser.rol.toUpperCase()}.`,
      ip: '10.150.2.45'
    };
    setAuditLogs(prev => [tempLog, ...prev]);

    return { success: true, message: `Bienvenido, ${updatedUser.nombreCompleto}` };
  };

  const changePassword = (currentPassword: string, newPassword: string): { success: boolean; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'No hay una sesión de usuario activa.' };
    }

    const expectedPassword = currentUser.password || (currentUser.username.toLowerCase() === 'admin' ? 'Guate2026*' : 'user123');
    if (currentPassword !== expectedPassword) {
      return { success: false, message: 'La contraseña actual ingresada no coincide.' };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }

    if (newPassword === currentPassword) {
      return { success: false, message: 'La nueva contraseña debe ser diferente a la contraseña actual.' };
    }

    const updatedUser: User = {
      ...currentUser,
      password: newPassword,
    };

    // Actualizar usuario actual y almacenamiento local
    setCurrentUser(updatedUser);
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(updatedUser));

    // Actualizar lista de usuarios y persistir en Firestore
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    saveUserToFirestore(updatedUser);

    // Auditoría
    logAudit(
      'EDITAR_USUARIO',
      'Seguridad',
      `Cambio de contraseña efectuado para la cuenta: ${currentUser.username} (${currentUser.nombreCompleto}).`,
      currentUser.id
    );

    // Notificación en el sistema
    addNotification({
      tipo: 'exito',
      titulo: 'Contraseña Modificada',
      mensaje: `La contraseña de ${currentUser.username} ha sido actualizada exitosamente en el sistema.`,
    });

    return { success: true, message: 'Contraseña modificada exitosamente.' };
  };

  const logout = () => {
    if (currentUser) {
      const tempLog: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        fecha: new Date().toISOString(),
        usuario: `${currentUser.username} (${currentUser.nombreCompleto})`,
        rol: currentUser.rol,
        accion: 'LOGOUT',
        modulo: 'Autenticación',
        detalles: 'Cierre de sesión de la plataforma.',
        ip: '10.150.2.45'
      };
      setAuditLogs(prev => [tempLog, ...prev]);
    }
    sessionStorage.removeItem('OJ_SESSION_ACTIVE');
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    setCurrentUser(null);
  };

  const switchDemoUser = (role: UserRole) => {
    const target = users.find(u => u.rol === role && u.activo) || users[0];
    if (target) {
      sessionStorage.setItem('OJ_SESSION_ACTIVE', 'true');
      setCurrentUser(target);
      setActiveTab('dashboard');
      logAudit('LOGIN', 'Autenticación', `Cambio rápido a perfil demo: ${target.rol.toUpperCase()} (${target.nombreCompleto})`);
    }
  };

  // Compras CRUD
  const addPurchase = (data: Omit<PurchaseRecord, 'id' | 'creadoPor' | 'fechaCreacion'>): PurchaseRecord => {
    // Determinar ID único sin colisiones analizando todos los IDs existentes
    let maxNum = 0;
    purchases.forEach(p => {
      const match = p.id.match(/^pur-(\d+)-(\d+)/);
      if (match) {
        const n = parseInt(match[2], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    let seq = Math.max(maxNum + 1, purchases.length + 1);
    let candidateId = `pur-2026-${String(seq).padStart(3, '0')}`;
    while (purchases.some(p => p.id === candidateId)) {
      seq++;
      candidateId = `pur-2026-${String(seq).padStart(3, '0')}`;
    }
    const newId = candidateId;
    const creator = currentUser ? currentUser.nombreCompleto : 'Operador GIT';
    const now = new Date();
    const nowIso = now.toISOString();
    const currentFecha = nowIso.slice(0, 10);
    const currentHora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const initialEvents: StatusTimelineEvent[] = data.historialEstatus ? [...data.historialEstatus] : [];
    
    // Auto-registrar hito de creación con sello inmutable de fecha y hora
    initialEvents.push({
      id: `auto_${now.getTime()}_creacion`,
      titulo: 'Registro Inicial de Solicitud F56-e',
      fase: 'Solicitud Inicial',
      fecha: data.fechaSolicitud || currentFecha,
      hora: currentHora,
      responsable: data.dependenciaSolicitante || data.areaSolicitante || 'Área Solicitante',
      observaciones: `Ingreso oficial del requerimiento al sistema. Formulario F56-e: ${data.f56e || 'S/N'}. NOG: ${data.nog}. Monto estimado: Q${(data.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}.`,
      documentoReferencia: `F56-e No. ${data.f56e}`,
      estado: 'completado',
      registradoPor: creator,
      fechaRegistro: nowIso,
      automatico: true,
    });

    if (data.evaluadoGIT === 'Sí' || data.fechaDictamenGIT) {
      initialEvents.push({
        id: `auto_${now.getTime()}_dictamen`,
        titulo: 'Llegó para Dictamen Técnico en GIT',
        fase: 'Dictamen Técnico',
        fecha: data.fechaDictamenGIT || data.fechaSolicitud || currentFecha,
        hora: currentHora,
        responsable: 'Gerencia de Informática - GIT',
        observaciones: 'Expediente registrado para evaluación técnica y emisión de dictamen por la GIT.',
        documentoReferencia: data.fechaDictamenGIT ? `Dictamen: ${data.fechaDictamenGIT}` : undefined,
        estado: 'completado',
        registradoPor: creator,
        fechaRegistro: nowIso,
        automatico: true,
      });
    }

    if (data.fechaElaboracionOficioGIT) {
      initialEvents.push({
        id: `auto_${now.getTime()}_oficio`,
        titulo: 'GIT lo remite a Dirección de Compras',
        fase: 'Compras',
        fecha: data.fechaElaboracionOficioGIT,
        hora: currentHora,
        responsable: 'Gerencia de Informática - GIT',
        observaciones: 'Oficio técnico formal elaborado por la GIT y remitido a Compras.',
        documentoReferencia: `Oficio GIT: ${data.fechaElaboracionOficioGIT}`,
        estado: 'completado',
        registradoPor: creator,
        fechaRegistro: nowIso,
        automatico: true,
      });
    }

    if (data.estatusEvento === 'Adjudicación') {
      initialEvents.push({
        id: `auto_${now.getTime()}_adjudicacion`,
        titulo: 'Adjudicación Definitiva',
        fase: 'Adjudicación',
        fecha: data.fechaAdjudicacion || currentFecha,
        hora: currentHora,
        responsable: 'Autoridad Superior / Compras',
        observaciones: data.proveedorAdjudicado ? `Adjudicado formalmente a: ${data.proveedorAdjudicado}.` : 'Adjudicación registrada.',
        estado: 'completado',
        registradoPor: creator,
        fechaRegistro: nowIso,
        automatico: true,
      });
    }

    const initialBitacora: PurchaseChangeLogEntry[] = [
      {
        id: `bit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fechaHora: nowIso,
        usuario: creator,
        rol: currentUser?.rol,
        accion: 'CREACION',
        estatus: data.estatusEvento || 'Registrada',
        detalles: `Registro inicial de solicitud F56: ${data.f56e || data.f56 || 'Sin F56'} | NOG: ${data.nog || 'Sin NOG'} | Monto: Q. ${Number(data.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 })}. Renglón asignado: [${data.renglonPresupuestario || '158'}].`,
        ip: '10.150.2.45'
      }
    ];

    const newRecord: PurchaseRecord = {
      ...data,
      id: newId,
      creadoPor: creator,
      fechaCreacion: nowIso,
      historialEstatus: initialEvents,
      bitacoraCambios: initialBitacora,
    };

    setPurchases(prev => [newRecord, ...prev]);

    // Respaldo de alta capacidad en IndexedDB para adjuntos pesados
    if (newRecord.f56Documento?.dataUrl) {
      saveAttachmentToIndexedDB(newRecord.id, newRecord.f56Documento).catch(err => 
        console.warn("Aviso al respaldar archivo en IndexedDB:", err)
      );
    }

    savePurchaseToFirestore(newRecord).then(res => {
      if (!res.success) {
        console.warn("Aviso Firestore al guardar compra:", res.error);
        showToast({
          type: 'warning',
          title: 'Sincronización Cloud',
          message: `Guardado en dispositivo local. La sincronización en la nube falló: ${res.error || 'Problema de red o permisos'}`,
          duration: 6000
        });
      }
    });

    logAudit(
      'CREAR_COMPRA', 
      'Compras', 
      `Creación de evento NOG: ${data.nog} - F56-e: ${data.f56e} (${data.descripcion.slice(0, 50)}...)`,
      newId,
      undefined,
      data
    );

    addNotification({
      tipo: 'info',
      titulo: 'Nueva Adquisición Registrada',
      mensaje: `NOG ${data.nog} registrado por Q.${data.monto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
      categoria: 'nuevo_registro',
      enlaceId: newId
    });

    showToast({
      type: 'success',
      title: 'Compra Guardada Exitosamente',
      message: `El evento NOG ${data.nog} (${data.f56e || 'F56-e'}) ha sido registrado con éxito.`,
      duration: 4500
    });

    return newRecord;
  };

  const importPurchases = async (
    records: Omit<PurchaseRecord, 'id' | 'creadoPor' | 'fechaCreacion'>[],
    replaceAll: boolean = false
  ): Promise<{ count: number }> => {
    if (!records || records.length === 0) {
      return { count: 0 };
    }

    const creator = currentUser ? currentUser.nombreCompleto : 'Operador GIT';
    const nowIso = new Date().toISOString();

    let maxNum = 0;
    const baseList = replaceAll ? [] : purchases;
    baseList.forEach(p => {
      const match = p.id.match(/^pur-(\d+)-(\d+)/);
      if (match) {
        const n = parseInt(match[2], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });

    const newPurchases: PurchaseRecord[] = [];
    const usedIds = new Set(baseList.map(p => p.id));

    records.forEach((rec, idx) => {
      let seq = maxNum + idx + 1;
      let candidateId = `pur-2026-${String(seq).padStart(3, '0')}`;
      while (usedIds.has(candidateId)) {
        seq++;
        candidateId = `pur-2026-${String(seq).padStart(3, '0')}`;
      }
      usedIds.add(candidateId);

      newPurchases.push({
        ...rec,
        id: candidateId,
        creadoPor: creator,
        fechaCreacion: nowIso,
      });
    });

    const updatedList = replaceAll ? newPurchases : [...newPurchases, ...purchases];
    setPurchases(updatedList);

    // Guardar en Firestore masivamente por lotes atómicos (optimizado para más de 100 registros)
    saveBatchPurchasesToFirestore(newPurchases).then(res => {
      if (res.success) {
        console.log(`Carga masiva de ${res.count} registros completada en Firestore.`);
      } else {
        console.warn("Aviso al guardar lote en Firestore:", res.error);
      }
    }).catch(err => {
      console.warn("Error guardando lote masivo importado en Firestore:", err);
    });

    logAudit(
      'IMPORTAR_DATOS',
      'Compras',
      `Importación masiva de ${newPurchases.length} adquisiciones desde archivo Excel/CSV (${replaceAll ? 'Reemplazo total' : 'Adición a existentes'}).`
    );

    addNotification({
      tipo: 'exito',
      titulo: 'Importación de Adquisiciones Completada',
      mensaje: `Se procesaron e integraron ${newPurchases.length} adquisiciones al sistema de forma exitosa.`,
      categoria: 'importacion',
    });

    showToast({
      type: 'success',
      title: 'Importación Exitosa',
      message: `Se importaron ${newPurchases.length} adquisiciones desde el archivo correctamente.`,
      duration: 5000,
    });

    return { count: newPurchases.length };
  };

  const updatePurchase = (id: string, data: Partial<PurchaseRecord>) => {
    const prev = purchases.find(p => p.id === id);
    if (!prev) return;

    const creator = currentUser ? currentUser.nombreCompleto : 'Operador GIT';
    const now = new Date();
    const nowIso = now.toISOString();

    // Base timeline de la compra (usar existente o calcular a partir de la ficha)
    const baseTimeline = (prev.historialEstatus && prev.historialEstatus.length > 0)
      ? [...prev.historialEstatus]
      : getPurchaseTimeline(prev);

    let updatedEvents = data.historialEstatus ? [...data.historialEstatus] : [...baseTimeline];

    // Detectar automáticamente cambios en campos y generar hitos sellados con fecha/hora actual
    const autoDetected = detectAutomaticEventsOnUpdate(prev, data, creator);
    if (autoDetected.length > 0) {
      // Evitar duplicar eventos si ya se pasaron explícitamente en data.historialEstatus
      const filteredAuto = autoDetected.filter(autoEv => 
        !updatedEvents.some(existing => 
          existing.titulo.toLowerCase().trim() === autoEv.titulo.toLowerCase().trim() && 
          existing.fecha === autoEv.fecha
        )
      );
      if (filteredAuto.length > 0) {
        updatedEvents = [...updatedEvents, ...filteredAuto];
      }
    }

    const currentBitacora = prev.bitacoraCambios ? [...prev.bitacoraCambios] : [];
    let updatedBitacora = data.bitacoraCambios ? [...data.bitacoraCambios] : currentBitacora;

    if (!data.bitacoraCambios) {
      const changesList: string[] = [];
      if (data.renglonPresupuestario && data.renglonPresupuestario !== prev.renglonPresupuestario) {
        changesList.push(`Asignación manual de renglón presupuestario: [${data.renglonPresupuestario} - ${data.nombreRenglon || ''}] (Anterior: [${prev.renglonPresupuestario || 'Sin asignar'}])`);
      }
      if (data.monto !== undefined && Number(data.monto) !== Number(prev.monto)) {
        changesList.push(`Monto modificado: de Q.${Number(prev.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 })} a Q.${Number(data.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`);
      }
      if (data.estatusEvento && data.estatusEvento !== prev.estatusEvento) {
        changesList.push(`Estatus modificado: de "${prev.estatusEvento}" a "${data.estatusEvento}"`);
      }
      if (data.proveedorAdjudicado && data.proveedorAdjudicado !== prev.proveedorAdjudicado) {
        changesList.push(`Proveedor adjudicado: ${data.proveedorAdjudicado}`);
      }
      if (data.estadoPago && data.estadoPago !== prev.estadoPago) {
        changesList.push(`Estado del gasto: "${data.estadoPago === 'pagado' ? 'Pagado (Descargado de Comprometido -> Rebajado en Saldo Real)' : 'Comprometido Pendiente'}"`);
      }
      if (changesList.length > 0) {
        const actionType = data.estadoPago === 'pagado' 
          ? 'PAGO_DEVENGADO' 
          : data.renglonPresupuestario !== prev.renglonPresupuestario 
            ? 'ASIGNACION_RENGLON' 
            : data.estatusEvento !== prev.estatusEvento 
              ? 'CAMBIO_ESTATUS' 
              : 'EDICION';

        const autoLog: PurchaseChangeLogEntry = {
          id: `bit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          fechaHora: nowIso,
          usuario: creator,
          rol: currentUser?.rol,
          accion: actionType,
          estatus: data.estatusEvento || prev.estatusEvento || 'Registrada',
          detalles: changesList.join(' | '),
          ip: '10.150.2.45'
        };
        updatedBitacora = [autoLog, ...updatedBitacora];
      }
    }

    // Si data.f56Documento viene sin dataUrl (por ser edición de otros campos), preservar el dataUrl que ya existía en prev.f56Documento
    const preservedDocument = data.f56Documento !== undefined
      ? (data.f56Documento ? {
          ...data.f56Documento,
          dataUrl: data.f56Documento.dataUrl || prev.f56Documento?.dataUrl
        } : undefined)
      : prev.f56Documento;

    const updated: PurchaseRecord = {
      ...prev,
      ...data,
      f56Documento: preservedDocument,
      historialEstatus: updatedEvents,
      bitacoraCambios: updatedBitacora,
      modificadoPor: creator,
      fechaModificacion: nowIso,
    };

    setPurchases(prevList => prevList.map(p => p.id === id ? updated : p));
    setSelectedPurchase(curr => (curr && curr.id === id ? updated : curr));
    
    // Respaldo de alta capacidad en IndexedDB para adjuntos
    if (updated.f56Documento?.dataUrl) {
      saveAttachmentToIndexedDB(id, updated.f56Documento).catch(err => 
        console.warn("Aviso al actualizar archivo en IndexedDB:", err)
      );
    }

    savePurchaseToFirestore(updated).then(res => {
      if (!res.success) {
        console.warn("Aviso Firestore al actualizar compra:", res.error);
        showToast({
          type: 'warning',
          title: 'Sincronización Cloud',
          message: `Cambios guardados localmente. Sincronización en la nube no completada: ${res.error || 'Verifique conexión'}`,
          duration: 6000
        });
      }
    });

    // Si cambió el estatus, emitir notificación especial
    if (data.estatusEvento && data.estatusEvento !== prev.estatusEvento) {
      logAudit(
        'CAMBIO_ESTATUS',
        'Compras',
        `Cambio de estatus para NOG ${prev.nog}: de "${prev.estatusEvento}" a "${data.estatusEvento}"`,
        id,
        { estatusEvento: prev.estatusEvento },
        { estatusEvento: data.estatusEvento }
      );

      const notifType = data.estatusEvento === 'Adjudicación' ? 'exito' : data.estatusEvento === 'Desierto' ? 'alerta' : 'info';
      addNotification({
        tipo: notifType,
        titulo: `Estatus Actualizado: ${data.estatusEvento}`,
        mensaje: `El evento NOG ${prev.nog} cambió de "${prev.estatusEvento}" a "${data.estatusEvento}"`,
        categoria: 'cambio_estatus',
        enlaceId: id
      });
    } else {
      logAudit(
        'EDITAR_COMPRA',
        'Compras',
        `Edición de registro NOG ${prev.nog} - F56-e: ${prev.f56e}`,
        id,
        prev,
        data
      );
    }

    showToast({
      type: 'success',
      title: 'Compra Actualizada Exitosamente',
      message: `Los cambios para el evento NOG ${updated.nog} fueron guardados en el sistema.`,
      duration: 4500
    });
  };

  const recordPurchaseMilestone = (
    purchaseId: string, 
    milestone: {
      titulo: string;
      fase?: string;
      responsable?: string;
      observaciones?: string;
      documentoReferencia?: string;
      estado?: TimelineEventState;
      nuevoEstatus?: string;
      additionalFields?: Partial<PurchaseRecord>;
    }
  ) => {
    const prev = purchases.find(p => p.id === purchaseId);
    if (!prev) return;

    const creator = currentUser ? currentUser.nombreCompleto : 'Operador GIT';
    const now = new Date();
    const nowIso = now.toISOString();
    const fecha = nowIso.slice(0, 10);
    const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newEvent: StatusTimelineEvent = {
      id: `auto_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
      titulo: milestone.titulo,
      fase: milestone.fase || 'Gestión',
      fecha,
      hora,
      responsable: milestone.responsable || 'Gerencia de Informática - GIT',
      observaciones: milestone.observaciones,
      documentoReferencia: milestone.documentoReferencia,
      estado: milestone.estado || 'completado',
      registradoPor: creator,
      fechaRegistro: nowIso,
      automatico: true,
    };

    const currentTimeline = (prev.historialEstatus && prev.historialEstatus.length > 0)
      ? [...prev.historialEstatus]
      : getPurchaseTimeline(prev);

    const updatedEvents = [...currentTimeline, newEvent];

    const patch: Partial<PurchaseRecord> = {
      ...(milestone.additionalFields || {}),
      historialEstatus: updatedEvents,
    };

    if (milestone.nuevoEstatus && milestone.nuevoEstatus !== prev.estatusEvento) {
      patch.estatusEvento = milestone.nuevoEstatus;
    }

    updatePurchase(purchaseId, patch);

    logAudit(
      'SISTEMA',
      'Compras',
      `Acción registrada automáticamente en línea de tiempo para NOG ${prev.nog} (${prev.f56e}): "${milestone.titulo}". Grabado: ${fecha} ${hora}.`,
      purchaseId,
      { estatusEvento: prev.estatusEvento },
      { estatusEvento: patch.estatusEvento || prev.estatusEvento, hito: milestone.titulo }
    );

    showToast({
      type: 'success',
      title: 'Acción Grabada Automáticamente',
      message: `"${milestone.titulo}" registrado exitosamente con fecha y hora ${fecha} ${hora} (Sello Inmutable).`
    });
  };

  const deletePurchase = (id: string) => {
    const prev = purchases.find(p => p.id === id);
    if (!prev) return;

    setPurchases(prevList => prevList.filter(p => p.id !== id));
    
    removePurchaseFromFirestore(id).then(res => {
      if (!res.success) {
        console.warn("Aviso Firestore al eliminar compra:", res.error);
      }
    });

    logAudit('ELIMINAR_COMPRA', 'Compras', `Eliminación de evento NOG: ${prev.nog} (${prev.descripcion.slice(0, 40)}...)`, id, prev);

    showToast({
      type: 'info',
      title: 'Compra Eliminada',
      message: `El registro NOG ${prev.nog} ha sido retirado del sistema.`,
      duration: 4000
    });
  };

  const deletePurchases = async (ids: string[]): Promise<{ count: number }> => {
    if (!ids || ids.length === 0) return { count: 0 };
    const idSet = new Set(ids);
    const removedPurchases = purchases.filter(p => idSet.has(p.id));
    const count = removedPurchases.length;
    if (count === 0) return { count: 0 };

    // Actualizar estado local inmediatamente
    setPurchases(prevList => prevList.filter(p => !idSet.has(p.id)));

    // Eliminar masivamente en Firestore por lotes atómicos
    removeBatchPurchasesFromFirestore(ids).then(res => {
      if (!res.success) {
        console.warn("Aviso Firestore al eliminar compras por lote:", res.error);
      }
    }).catch(err => {
      console.warn("Error eliminando compras masivas en Firestore:", err);
    });

    const totalMontoEliminado = removedPurchases.reduce((acc, p) => acc + (p.monto || 0), 0);
    const nogSample = removedPurchases.slice(0, 4).map(p => p.nog).join(', ') + (count > 4 ? ` y ${count - 4} más...` : '');

    logAudit(
      'ELIMINAR_COMPRA',
      'Compras',
      `Eliminación masiva de ${count} adquisiciones por un monto total de Q${totalMontoEliminado.toLocaleString('es-GT', { minimumFractionDigits: 2 })}. NOGs: ${nogSample}`,
      undefined,
      { cantidadEliminada: count, totalMonto: totalMontoEliminado, nogs: removedPurchases.map(p => p.nog) }
    );

    addNotification({
      tipo: 'advertencia',
      titulo: 'Eliminación Masiva de Adquisiciones',
      mensaje: `Se eliminaron ${count} adquisiciones del sistema permanentemente.`,
      categoria: 'sistema'
    });

    showToast({
      type: 'info',
      title: 'Adquisiciones Eliminadas',
      message: `Se eliminaron ${count} adquisiciones del sistema exitosamente.`,
      duration: 5000
    });

    return { count };
  };

  // Catálogos CRUD
  const addCatalog = (data: Omit<Catalog, 'id' | 'esSistema'>): Catalog => {
    const newCat: Catalog = {
      ...data,
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      esSistema: false,
    };
    setCatalogs(prev => [...prev, newCat]);
    saveCatalogToFirestore(newCat);
    logAudit('CREAR_CATALOGO', 'Catálogos', `Creación de nuevo catálogo: ${data.nombre} (${data.codigo})`, newCat.id);
    return newCat;
  };

  const updateCatalog = (id: string, data: Partial<Catalog>) => {
    const current = catalogs.find(c => c.id === id);
    if (!current) return;
    const updated = { ...current, ...data };
    setCatalogs(prev => prev.map(c => c.id === id ? updated : c));
    saveCatalogToFirestore(updated);
    logAudit('EDITAR_CATALOGO', 'Catálogos', `Actualización de catálogo ID: ${id}`, id, undefined, data);
  };

  const deleteCatalog = (id: string) => {
    const cat = catalogs.find(c => c.id === id);
    if (cat?.esSistema) return; // Proteger catálogos del sistema
    setCatalogs(prev => prev.filter(c => c.id !== id));
    removeCatalogFromFirestore(id);
    logAudit('EDITAR_CATALOGO', 'Catálogos', `Eliminación de catálogo: ${cat?.nombre}`, id);
  };

  const addCatalogItem = (catalogId: string, item: Omit<CatalogItem, 'id'>) => {
    const newItem: CatalogItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    let updatedCatalog: Catalog | null = null;
    setCatalogs(prev => prev.map(cat => {
      if (cat.id === catalogId) {
        updatedCatalog = {
          ...cat,
          items: [...cat.items, newItem]
        };
        return updatedCatalog;
      }
      return cat;
    }));
    if (updatedCatalog) {
      saveCatalogToFirestore(updatedCatalog);
    }
    logAudit('EDITAR_CATALOGO', 'Catálogos', `Añadido elemento "${item.valor}" al catálogo ID: ${catalogId}`, catalogId);
  };

  const updateCatalogItem = (catalogId: string, itemId: string, item: Partial<CatalogItem>) => {
    let updatedCatalog: Catalog | null = null;
    setCatalogs(prev => prev.map(cat => {
      if (cat.id === catalogId) {
        updatedCatalog = {
          ...cat,
          items: cat.items.map(it => it.id === itemId ? { ...it, ...item } : it)
        };
        return updatedCatalog;
      }
      return cat;
    }));
    if (updatedCatalog) {
      saveCatalogToFirestore(updatedCatalog);
    }
    logAudit('EDITAR_CATALOGO', 'Catálogos', `Modificado elemento ${itemId} en catálogo ID: ${catalogId}`, catalogId);
  };

  const deleteCatalogItem = (catalogId: string, itemId: string) => {
    let updatedCatalog: Catalog | null = null;
    setCatalogs(prev => prev.map(cat => {
      if (cat.id === catalogId) {
        updatedCatalog = {
          ...cat,
          items: cat.items.filter(it => it.id !== itemId)
        };
        return updatedCatalog;
      }
      return cat;
    }));
    if (updatedCatalog) {
      saveCatalogToFirestore(updatedCatalog);
    }
    logAudit('EDITAR_CATALOGO', 'Catálogos', `Eliminado elemento ${itemId} de catálogo ID: ${catalogId}`, catalogId);
  };

  // Usuarios CRUD
  const addUser = (data: Omit<User, 'id' | 'fechaCreacion'>): User => {
    const newUser: User = {
      ...data,
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fechaCreacion: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    saveUserToFirestore(newUser);
    logAudit('CREAR_USUARIO', 'Usuarios', `Creación de usuario: ${newUser.username} con rol ${newUser.rol}`, newUser.id);
    return newUser;
  };

  const updateUser = (id: string, data: Partial<User>) => {
    const current = users.find(u => u.id === id);
    if (!current) return;
    const updated = { ...current, ...data };
    setUsers(prev => prev.map(u => u.id === id ? updated : u));
    saveUserToFirestore(updated);
    logAudit('EDITAR_USUARIO', 'Usuarios', `Actualización de usuario ID: ${id}`, id, undefined, data);
  };

  const toggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextState = !u.activo;
        const updated = { ...u, activo: nextState };
        saveUserToFirestore(updated);
        logAudit('EDITAR_USUARIO', 'Usuarios', `Cambio de estado de usuario ${u.username} a ${nextState ? 'ACTIVO' : 'INACTIVO'}`, id);
        return updated;
      }
      return u;
    }));
  };

  const deleteUser = (id: string) => {
    const user = users.find(u => u.id === id);
    if (user?.username === 'admin') return; // Proteger superadmin
    setUsers(prev => prev.filter(u => u.id !== id));
    removeUserFromFirestore(id);
    logAudit('EDITAR_USUARIO', 'Usuarios', `Eliminación de usuario: ${user?.username}`, id);
  };

  // Perfiles de Usuario CRUD y Control de Acceso
  const addUserProfile = (data: Omit<UserProfile, 'id' | 'esSistema' | 'fechaCreacion'>): UserProfile => {
    const newProfile: UserProfile = {
      ...data,
      id: `prof-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      esSistema: false,
      fechaCreacion: new Date().toISOString(),
    };
    setUserProfiles(prev => [...prev, newProfile]);
    saveUserProfileToFirestore(newProfile);
    logAudit('CREAR_PERFIL_USUARIO', 'Perfiles', `Creación de nuevo perfil: ${newProfile.nombre} (${newProfile.codigo}) con ${newProfile.modulosPermitidos.length} módulos asignados`, newProfile.id);
    showToast({
      type: 'success',
      title: 'Perfil Creado Exitosamente',
      message: `El perfil institucional "${newProfile.nombre}" ha sido registrado.`,
      duration: 4500
    });
    return newProfile;
  };

  const updateUserProfile = (id: string, data: Partial<UserProfile>) => {
    const current = userProfiles.find(p => p.id === id);
    if (!current) return;
    const updated: UserProfile = { ...current, ...data };
    setUserProfiles(prev => prev.map(p => p.id === id ? updated : p));
    saveUserProfileToFirestore(updated);
    logAudit('EDITAR_PERFIL_USUARIO', 'Perfiles', `Actualización de perfil ID: ${id} - ${updated.nombre}`, id, current, data);
    showToast({
      type: 'success',
      title: 'Perfil Actualizado',
      message: `Permisos y datos del perfil "${updated.nombre}" guardados.`,
      duration: 4000
    });
  };

  const deleteUserProfile = (id: string) => {
    const profile = userProfiles.find(p => p.id === id);
    if (!profile) return;
    if (profile.esSistema) {
      showToast({
        type: 'alerta',
        title: 'Acción Protegida',
        message: 'No es posible eliminar perfiles base del sistema.',
        duration: 4000
      });
      return;
    }
    // Verificar si algún usuario tiene asignado este perfil
    const assignedUsers = users.filter(u => u.perfilId === id || u.rol === profile.codigo);
    if (assignedUsers.length > 0) {
      showToast({
        type: 'alerta',
        title: 'Perfil en Uso',
        message: `No se puede eliminar porque hay ${assignedUsers.length} usuario(s) asignados a este perfil. Reasígnelos primero.`,
        duration: 5000
      });
      return;
    }
    setUserProfiles(prev => prev.filter(p => p.id !== id));
    deleteUserProfileFromFirestore(id);
    logAudit('ELIMINAR_PERFIL_USUARIO', 'Perfiles', `Eliminación de perfil de usuario: ${profile.nombre} (${profile.codigo})`, id);
    showToast({
      type: 'info',
      title: 'Perfil Eliminado',
      message: `El perfil "${profile.nombre}" ha sido eliminado del sistema.`,
      duration: 4000
    });
  };

  const hasModuleAccess = useCallback((tab: ActiveTab): boolean => {
    if (!currentUser) return false;
    // Administrador general siempre tiene acceso total
    if (currentUser.rol === 'administrador') return true;

    // Buscar perfil asignado (por perfilId o por código de rol)
    const profile = userProfiles.find(p => 
      (currentUser.perfilId && (p.id === currentUser.perfilId || p.codigo === currentUser.perfilId)) ||
      p.codigo === currentUser.rol ||
      p.id === currentUser.rol
    );

    if (profile && Array.isArray(profile.modulosPermitidos)) {
      return profile.modulosPermitidos.includes(tab);
    }

    // Reglas de respaldo si el perfil no fue cargado
    if (currentUser.rol === 'auditor') {
      return ['dashboard', 'compras', 'presupuesto', 'reportes', 'auditoria'].includes(tab);
    }
    if (currentUser.rol === 'usuario_estandar') {
      return ['dashboard', 'compras', 'reportes'].includes(tab);
    }

    return tab === 'dashboard';
  }, [currentUser, userProfiles]);

  const getUserProfile = useCallback((user?: User | null): UserProfile | undefined => {
    const target = user || currentUser;
    if (!target) return undefined;
    return userProfiles.find(p => 
      (target.perfilId && (p.id === target.perfilId || p.codigo === target.perfilId)) ||
      p.codigo === target.rol ||
      p.id === target.rol
    );
  }, [currentUser, userProfiles]);

  // Notificaciones
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const triggerSimulatedNotification = () => {
    const samples = [
      {
        tipo: 'urgente' as const,
        titulo: 'Visto Bueno Pendiente',
        mensaje: 'La solicitud F56-e F56-2024-038 requiere Vo.Bo. de la Gerencia de Informática antes de las 16:00 hrs.',
        categoria: 'aprobacion_vobo' as const,
      },
      {
        tipo: 'exito' as const,
        titulo: 'Ofertas Recibidas en Guatecompras',
        mensaje: 'Se han recibido 3 ofertas para el evento NOG 22019482 (Licenciamiento Enterprise).',
        categoria: 'vencimiento_oferta' as const,
      },
      {
        tipo: 'alerta' as const,
        titulo: 'Alerta de Presupuesto GIT',
        mensaje: 'La ejecución presupuestaria del rubro de Telecomunicaciones ha alcanzado el 78% del techo asignado.',
        categoria: 'sistema' as const,
      }
    ];
    const chosen = samples[Math.floor(Math.random() * samples.length)];
    addNotification(chosen);
  };

  // MÉTODOS DEL MÓDULO FINANCIERO Y PRESUPUESTARIO
  const budgetAvailability = calculateBudgetAvailability(budgetLines, budgetModifications, purchases);

  const addBudgetLine = (data: Omit<BudgetLineItem, 'id' | 'fechaCreacion'>): BudgetLineItem => {
    const newItem: BudgetLineItem = {
      ...data,
      id: `bl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      creadoPor: currentUser?.nombreCompleto || 'Sistema',
      fechaCreacion: new Date().toISOString()
    };
    const updated = [...budgetLines, newItem];
    setBudgetLines(updated);
    localStorage.setItem(STORAGE_KEYS.BUDGET_LINES, JSON.stringify(updated));
    saveBudgetLineToFirestore(newItem);

    logAudit(
      'CREAR_RENGLON',
      'Presupuesto',
      `Creación de nuevo renglón presupuestario: ${newItem.renglonPresupuestario} - ${newItem.nombreRenglon} (Techo Inicial: Q. ${newItem.presupuestoInicial.toLocaleString('es-GT', { minimumFractionDigits: 2 })})`,
      newItem.id,
      undefined,
      newItem
    );
    showToast({
      title: 'Renglón Creado',
      message: `El renglón ${newItem.renglonPresupuestario} se registró exitosamente en el presupuesto GIT.`,
      type: 'success'
    });
    return newItem;
  };

  const updateBudgetLine = (id: string, data: Partial<BudgetLineItem>) => {
    const cleanRenglon = data.renglonPresupuestario ? String(data.renglonPresupuestario).trim() : '';
    const prevItem = budgetLines.find(l => l.id === id || (cleanRenglon && String(l.renglonPresupuestario).trim() === cleanRenglon));
    const targetId = prevItem?.id || id;

    let found = false;
    const updated = budgetLines.map(line => {
      if (line.id === targetId || (cleanRenglon && String(line.renglonPresupuestario).trim() === cleanRenglon)) {
        found = true;
        const item: BudgetLineItem = {
          ...line,
          ...data,
          id: line.id || targetId,
          renglonPresupuestario: cleanRenglon || String(line.renglonPresupuestario || ''),
          nombreRenglon: data.nombreRenglon ? String(data.nombreRenglon).trim() : String(line.nombreRenglon || ''),
          presupuestoInicial: data.presupuestoInicial !== undefined ? Number(data.presupuestoInicial) : Number(line.presupuestoInicial) || 0,
          modificacionesAprobadas: data.modificacionesAprobadas !== undefined ? Number(data.modificacionesAprobadas) : Number(line.modificacionesAprobadas) || 0,
          presupuestoVigente: data.presupuestoVigente !== undefined ? Number(data.presupuestoVigente) : Number(line.presupuestoVigente) || 0,
          pagadoQueRebaja: data.pagadoQueRebaja !== undefined ? Number(data.pagadoQueRebaja) : Number(line.pagadoQueRebaja) || 0,
          disponibleReal: data.disponibleReal !== undefined ? Number(data.disponibleReal) : Number(line.disponibleReal) || 0,
          comprometidoPendiente: data.comprometidoPendiente !== undefined ? Number(data.comprometidoPendiente) : Number(line.comprometidoPendiente) || 0,
          disponibleProyectado: data.disponibleProyectado !== undefined ? Number(data.disponibleProyectado) : Number(line.disponibleProyectado) || 0,
          porcentajeUsadoComprometido: data.porcentajeUsadoComprometido !== undefined ? Number(data.porcentajeUsadoComprometido) : Number(line.porcentajeUsadoComprometido) || 0,
          fechaModificacion: new Date().toISOString(),
          modificadoPor: currentUser?.nombreCompleto || 'Usuario del Sistema'
        };
        saveBudgetLineToFirestore(item).catch(err => console.warn("Error guardando en Firestore:", err));
        return item;
      }
      return line;
    });

    const finalList = found ? updated : [
      ...budgetLines,
      {
        id: targetId,
        grupoPresupuestario: data.grupoPresupuestario || 'Grupo 100 - Servicios No Personales',
        renglonPresupuestario: cleanRenglon || String(data.renglonPresupuestario || ''),
        nombreRenglon: String(data.nombreRenglon || ''),
        presupuestoInicial: Number(data.presupuestoInicial) || 0,
        modificacionesAprobadas: Number(data.modificacionesAprobadas) || 0,
        presupuestoVigente: Number(data.presupuestoVigente) || Number(data.presupuestoInicial) || 0,
        pagadoQueRebaja: Number(data.pagadoQueRebaja) || 0,
        disponibleReal: Number(data.disponibleReal) || 0,
        comprometidoPendiente: Number(data.comprometidoPendiente) || 0,
        disponibleProyectado: Number(data.disponibleProyectado) || 0,
        porcentajeUsadoComprometido: Number(data.porcentajeUsadoComprometido) || 0,
        estatusDisponibilidad: data.estatusDisponibilidad || 'Con Disponibilidad',
        observaciones: data.observaciones || '',
        ejercicioFiscal: 2026,
        fechaCreacion: new Date().toISOString(),
        creadoPor: currentUser?.nombreCompleto || 'Usuario del Sistema'
      }
    ];

    setBudgetLines(finalList);
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGET_LINES, JSON.stringify(finalList));
    } catch (e) {
      console.warn("Error persistiendo presupuesto en localStorage:", e);
    }

    logAudit(
      'EDITAR_RENGLON',
      'Presupuesto',
      `Actualización del renglón presupuestario: ${cleanRenglon || prevItem?.renglonPresupuestario || targetId}`,
      targetId,
      prevItem,
      data
    );

    showToast({
      title: 'Renglón Actualizado',
      message: `Cambios guardados en el renglón ${cleanRenglon || prevItem?.renglonPresupuestario || ''}.`,
      type: 'success'
    });
  };

  const deleteBudgetLine = (id: string) => {
    const item = budgetLines.find(l => l.id === id);
    const updated = budgetLines.filter(l => l.id !== id);
    setBudgetLines(updated);
    localStorage.setItem(STORAGE_KEYS.BUDGET_LINES, JSON.stringify(updated));
    removeBudgetLineFromFirestore(id);

    logAudit(
      'ELIMINAR_RENGLON',
      'Presupuesto',
      `Eliminación del renglón presupuestario: ${item?.renglonPresupuestario} - ${item?.nombreRenglon}`,
      id,
      item,
      undefined
    );
    showToast({
      title: 'Renglón Eliminado',
      message: `El renglón ${item?.renglonPresupuestario} fue removido del presupuesto.`,
      type: 'advertencia'
    });
  };

  const importBudgetLines = async (
    lines: Omit<BudgetLineItem, 'id' | 'fechaCreacion'>[],
    replaceAll: boolean = false
  ): Promise<{ count: number }> => {
    const formatted: BudgetLineItem[] = lines.map((l, idx) => ({
      ...l,
      id: `bl-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      creadoPor: currentUser?.nombreCompleto || 'Importación Excel',
      fechaCreacion: new Date().toISOString()
    }));

    let resultList: BudgetLineItem[];
    if (replaceAll) {
      resultList = formatted;
    } else {
      // Reemplaza los existentes con mismo renglonPresupuestario o los agrega
      const map = new Map<string, BudgetLineItem>();
      budgetLines.forEach(bl => map.set(bl.renglonPresupuestario, bl));
      formatted.forEach(fl => map.set(fl.renglonPresupuestario, fl));
      resultList = Array.from(map.values());
    }

    setBudgetLines(resultList);
    localStorage.setItem(STORAGE_KEYS.BUDGET_LINES, JSON.stringify(resultList));
    await saveBatchBudgetLinesToFirestore(resultList);

    logAudit(
      'IMPORTAR_PRESUPUESTO',
      'Presupuesto',
      `Importación masiva de presupuesto desde archivo Excel (${formatted.length} renglones procesados, modo: ${replaceAll ? 'Reemplazo total' : 'Actualización/Fusión'}).`
    );

    addNotification({
      tipo: 'exito',
      titulo: 'Presupuesto Actualizado vía Excel',
      mensaje: `Se procesaron exitosamente ${formatted.length} renglones presupuestarios de la Gerencia de Informática.`,
      categoria: 'sistema'
    });

    showToast({
      title: 'Presupuesto Importado',
      message: `Se importaron ${formatted.length} renglones presupuestarios correctamente.`,
      type: 'exito'
    });

    return { count: formatted.length };
  };

  const addBudgetModification = (data: Omit<BudgetModification, 'id' | 'correlativo' | 'fechaCreacion'>): BudgetModification => {
    const correlativo = `MOD-2026-${String(budgetModifications.length + 1).padStart(3, '0')}`;
    const newMod: BudgetModification = {
      ...data,
      id: `mod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      correlativo,
      creadoPor: currentUser?.nombreCompleto || 'Sistema',
      fechaCreacion: new Date().toISOString()
    };

    const updated = [newMod, ...budgetModifications];
    setBudgetModifications(updated);
    localStorage.setItem(STORAGE_KEYS.BUDGET_MODIFICATIONS, JSON.stringify(updated));
    saveBudgetModificationToFirestore(newMod);

    logAudit(
      'CREAR_MODIFICACION_PRESUPUESTARIA',
      'Presupuesto',
      `Registro de modificación presupuestaria ${correlativo} (${newMod.tipo.toUpperCase()}) por Q. ${newMod.monto.toLocaleString('es-GT', { minimumFractionDigits: 2 })} en el renglón ${newMod.renglonPresupuestario}. Estatus: ${newMod.estado}`,
      newMod.id,
      undefined,
      newMod
    );

    showToast({
      title: 'Modificación Registrada',
      message: `${correlativo} creada exitosamente. ${newMod.estado === 'aprobada' ? 'Afectó disponibilidades de inmediato.' : 'Pendiente de aprobación.'}`,
      type: newMod.estado === 'aprobada' ? 'exito' : 'info'
    });

    return newMod;
  };

  const updateBudgetModification = (id: string, data: Partial<BudgetModification>) => {
    const prev = budgetModifications.find(m => m.id === id);
    const updated = budgetModifications.map(m => {
      if (m.id === id) {
        const item = { ...m, ...data };
        saveBudgetModificationToFirestore(item);
        return item;
      }
      return m;
    });
    setBudgetModifications(updated);
    localStorage.setItem(STORAGE_KEYS.BUDGET_MODIFICATIONS, JSON.stringify(updated));

    logAudit(
      'CREAR_MODIFICACION_PRESUPUESTARIA',
      'Presupuesto',
      `Actualización de modificación presupuestaria: ${prev?.correlativo || id}`,
      id,
      prev,
      data
    );
  };

  const deleteBudgetModification = (id: string) => {
    const item = budgetModifications.find(m => m.id === id);
    const updated = budgetModifications.filter(m => m.id !== id);
    setBudgetModifications(updated);
    localStorage.setItem(STORAGE_KEYS.BUDGET_MODIFICATIONS, JSON.stringify(updated));
    removeBudgetModificationFromFirestore(id);

    showToast({
      title: 'Modificación Eliminada',
      message: `Se eliminó la modificación presupuestaria ${item?.correlativo || id}.`,
      type: 'advertencia'
    });
  };

  const approveBudgetModification = (id: string) => {
    const mod = budgetModifications.find(m => m.id === id);
    if (!mod) return;

    const updated = budgetModifications.map(m => {
      if (m.id === id) {
        const approved: BudgetModification = {
          ...m,
          estado: 'aprobada',
          aprobadoPor: currentUser?.nombreCompleto || 'Dirección Financiera DAF',
          fechaAprobacion: new Date().toISOString().slice(0, 10)
        };
        saveBudgetModificationToFirestore(approved);
        return approved;
      }
      return m;
    });
    setBudgetModifications(updated);
    localStorage.setItem(STORAGE_KEYS.BUDGET_MODIFICATIONS, JSON.stringify(updated));

    logAudit(
      'APROBAR_MODIFICACION_PRESUPUESTARIA',
      'Presupuesto',
      `Aprobación formal de la modificación presupuestaria ${mod.correlativo} por monto de Q. ${mod.monto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}. Afectó automáticamente el presupuesto vigente y la disponibilidad.`,
      id
    );

    addNotification({
      tipo: 'exito',
      titulo: `Modificación Aprobada: ${mod.correlativo}`,
      mensaje: `La modificación presupuestaria fue aprobada e impactó positivamente/negativamente el renglón ${mod.renglonPresupuestario}.`,
      categoria: 'sistema'
    });

    showToast({
      title: 'Modificación Aprobada',
      message: `${mod.correlativo} aprobada. Las disponibilidades se recalcularon automáticamente.`,
      type: 'exito'
    });
  };

  const rejectBudgetModification = (id: string) => {
    const mod = budgetModifications.find(m => m.id === id);
    if (!mod) return;

    const updated = budgetModifications.map(m => {
      if (m.id === id) {
        const rejected: BudgetModification = {
          ...m,
          estado: 'rechazada'
        };
        saveBudgetModificationToFirestore(rejected);
        return rejected;
      }
      return m;
    });
    setBudgetModifications(updated);
    localStorage.setItem(STORAGE_KEYS.BUDGET_MODIFICATIONS, JSON.stringify(updated));

    showToast({
      title: 'Modificación Rechazada',
      message: `${mod.correlativo} ha sido marcada como rechazada.`,
      type: 'advertencia'
    });
  };

  const togglePurchasePaymentState = (purchaseId: string) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    const nuevoEstado = purchase.estadoPago === 'pagado' ? 'comprometido' : 'pagado';
    const nuevoMontoPagado = nuevoEstado === 'pagado' ? (purchase.montoPagado || purchase.monto) : 0;
    const nuevoEstatus = nuevoEstado === 'pagado' ? 'Pagada' : (purchase.estatusEvento === 'Pagada' ? 'Adjudicación' : purchase.estatusEvento);
    const nowIso = new Date().toISOString();

    const bitacoraEntry: PurchaseChangeLogEntry = {
      id: `bit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fechaHora: nowIso,
      usuario: currentUser ? currentUser.nombreCompleto : 'Operador GIT',
      rol: currentUser?.rol,
      accion: nuevoEstado === 'pagado' ? 'PAGO_DEVENGADO' : 'REVERSION_PAGO',
      estatus: nuevoEstatus,
      detalles: nuevoEstado === 'pagado'
        ? `Pago formal devengado por Q. ${Number(purchase.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 })}. Se descargó de la columna Comprometido Pendiente y se restó en Disponible Real del renglón [${purchase.renglonPresupuestario || '158'}].`
        : `Reversión de pago a Comprometido Pendiente por Q. ${Number(purchase.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 })}. El saldo retornó a Disponible Real.`,
      ip: '10.150.2.45'
    };

    const currentBitacora = purchase.bitacoraCambios || [];

    updatePurchase(purchaseId, {
      estadoPago: nuevoEstado,
      estatusEvento: nuevoEstatus,
      montoPagado: nuevoMontoPagado,
      fechaPago: nuevoEstado === 'pagado' ? nowIso : undefined,
      bitacoraCambios: [bitacoraEntry, ...currentBitacora]
    });

    logAudit(
      nuevoEstado === 'pagado' ? 'PAGO_COMPRA' as any : 'REVERTIR_PAGO' as any,
      'Presupuesto',
      `Cambio de estado presupuestario para adquisición NOG ${purchase.nog} - F56: ${purchase.f56e || purchase.f56 || purchase.id}. Estado: ${nuevoEstado.toUpperCase()}. Monto: Q. ${Number(purchase.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 })}. Renglón: [${purchase.renglonPresupuestario || '158'}].`,
      purchaseId
    );

    showToast({
      title: nuevoEstado === 'pagado' ? 'Adquisición Pagada Exitosamente' : 'Adquisición en Comprometido',
      message: nuevoEstado === 'pagado' 
        ? `Descargada de Comprometido Pendiente. Se restó Q. ${Number(purchase.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 })} del Disponible Real.`
        : `Restablecida a Comprometido Pendiente. Q. ${Number(purchase.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 })} retornó a Disponible Real.`,
      type: nuevoEstado === 'pagado' ? 'exito' : 'info'
    });
  };

  const addPurchaseBitacoraEntry = (purchaseId: string, entry: Omit<PurchaseChangeLogEntry, 'id' | 'fechaHora' | 'usuario'>) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    const nowIso = new Date().toISOString();
    const newEntry: PurchaseChangeLogEntry = {
      ...entry,
      id: `bit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fechaHora: nowIso,
      usuario: currentUser ? currentUser.nombreCompleto : 'Operador GIT',
      rol: currentUser?.rol,
      ip: '10.150.2.45'
    };

    const currentBitacora = purchase.bitacoraCambios || [];
    updatePurchase(purchaseId, {
      bitacoraCambios: [newEntry, ...currentBitacora]
    });

    showToast({
      title: 'Registro Añadido a Bitácora',
      message: 'Se agregó la anotación oficial al historial de auditoría de la ficha.',
      type: 'exito'
    });
  };

  const resetToDemoData = () => {
    setUsers(INITIAL_USERS);
    setPurchases(INITIAL_PURCHASES);
    setCatalogs(INITIAL_CATALOGS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setBudgetLines(INITIAL_BUDGET_LINES);
    setBudgetModifications(INITIAL_BUDGET_MODIFICATIONS);
    setCurrentUser(INITIAL_USERS[0]);
    localStorage.clear();
    logAudit('RESTAURAR_DATOS', 'Sistema', 'Restauración completa de los datos de demostración del sistema.');
  };

  const unreadNotificationsCount = notifications.filter(n => !n.leida).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        purchases,
        catalogs,
        auditLogs,
        notifications,
        unreadNotificationsCount,
        activeTab,
        setActiveTab,
        isOnline,
        isFirestoreConnected,
        firestoreStatus,
        refreshPurchases,
        selectedPurchase,
        setSelectedPurchase,
        isPurchaseModalOpen,
        setIsPurchaseModalOpen,
        purchaseToEdit,
        setPurchaseToEdit,
        isLoginModalOpen,
        setIsLoginModalOpen,
        isChangePasswordModalOpen,
        setIsChangePasswordModalOpen,
        isImportModalOpen,
        setIsImportModalOpen,
        login,
        logout,
        changePassword,
        switchDemoUser,
        addPurchase,
        importPurchases,
        updatePurchase,
        recordPurchaseMilestone,
        deletePurchase,
        deletePurchases,
        addCatalog,
        updateCatalog,
        deleteCatalog,
        addCatalogItem,
        updateCatalogItem,
        deleteCatalogItem,
        addUser,
        updateUser,
        toggleUserStatus,
        deleteUser,
        userProfiles,
        addUserProfile,
        updateUserProfile,
        deleteUserProfile,
        hasModuleAccess,
        getUserProfile,
        logAudit,
        markNotificationRead,
        markAllNotificationsRead,
        addNotification,
        triggerSimulatedNotification,
        toasts,
        showToast,
        dismissToast,
        resetToDemoData,
        theme,
        setTheme,
        themeConfig,
        customLogo,
        setCustomLogo,
        resetLogo,
        gmailConfig,
        updateGmailConfig,
        testGmailConnection,
        sendEmailNotification,
        sendUserWelcomeEmail,
        budgetLines,
        budgetModifications,
        budgetAvailability,
        addBudgetLine,
        updateBudgetLine,
        deleteBudgetLine,
        importBudgetLines,
        addBudgetModification,
        updateBudgetModification,
        deleteBudgetModification,
        approveBudgetModification,
        rejectBudgetModification,
        togglePurchasePaymentState,
        addPurchaseBitacoraEntry,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};
