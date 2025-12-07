import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Organization, OrganizationMember, User, SubscriptionTier, TIER_LIMITS } from '../../types';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import {
  Search,
  Building2,
  ChevronDown,
  ChevronRight,
  Users,
  FolderOpen,
  Crown,
  RefreshCw,
  Ban,
  CheckCircle2,
  Eye,
  Trash2,
  AlertTriangle,
  Zap,
  FileText,
  Gift,
  Globe,
  Archive
} from 'lucide-react';
import { AdminOrgStatementModal } from '../../components/AdminOrgStatementModal';
import { AdminGrantCreditsModal } from '../../components/AdminGrantCreditsModal';

interface OrgWithDetails extends Organization {
  ownerEmail?: string;
  memberCount: number;
  projectCount: number;
}

export const AdminOrganizations: React.FC = () => {
  const navigate = useNavigate();
  const { startImpersonation, loading: impersonationLoading } = useImpersonation();
  const [organizations, setOrganizations] = useState<OrgWithDetails[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<OrgWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<SubscriptionTier | 'ALL'>('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const [statementModalOrg, setStatementModalOrg] = useState<Organization | null>(null);
  const [grantModalOrg, setGrantModalOrg] = useState<Organization | null>(null);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      // Fetch orgs
      const orgsSnap = await getDocs(collection(db, 'organizations'));
      const orgsData = orgsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        memberCount: 0,
        projectCount: 0
      })) as OrgWithDetails[];

      // Fetch all users for owner emails
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersMap = new Map<string, User>();
      usersSnap.docs.forEach(doc => {
        usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
      });

      // Fetch all org members
      const membersSnap = await getDocs(collection(db, 'organizationMembers'));
      const membersByOrg = new Map<string, number>();
      membersSnap.docs.forEach(doc => {
        const member = doc.data() as OrganizationMember;
        membersByOrg.set(member.organizationId, (membersByOrg.get(member.organizationId) || 0) + 1);
      });

      // Enrich org data
      const enrichedOrgs = await Promise.all(orgsData.map(async (org) => {
        // Get owner email
        const owner = usersMap.get(org.ownerId);

        // Get member count
        const memberCount = membersByOrg.get(org.id) || 1;

        // Get project count
        let projectCount = 0;
        try {
          const projectsSnap = await getDocs(collection(db, `organizations/${org.id}/projects`));
          projectCount = projectsSnap.size;
        } catch (e) {
          // May not have access
        }

        return {
          ...org,
          ownerEmail: owner?.email,
          memberCount,
          projectCount
        };
      }));

      setOrganizations(enrichedOrgs);
      setFilteredOrgs(enrichedOrgs);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    let filtered = organizations;

    // Archive filter - hide archived by default
    if (!showArchived) {
      filtered = filtered.filter(o => !o.isArchived);
    } else {
      // When showing archived, only show archived
      filtered = filtered.filter(o => o.isArchived);
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.name.toLowerCase().includes(q) ||
        o.ownerEmail?.toLowerCase().includes(q)
      );
    }

    // Tier filter
    if (tierFilter !== 'ALL') {
      filtered = filtered.filter(o => o.subscriptionTier === tierFilter);
    }

    setFilteredOrgs(filtered);
  }, [searchQuery, tierFilter, organizations, showArchived]);

  const updateOrgTier = async (orgId: string, newTier: SubscriptionTier) => {
    setUpdating(orgId);
    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        subscriptionTier: newTier,
        updatedAt: Timestamp.now()
      });
      setOrganizations(organizations.map(o =>
        o.id === orgId ? { ...o, subscriptionTier: newTier } : o
      ));
    } catch (error) {
      console.error('Error updating org tier:', error);
      alert('Failed to update subscription tier');
    } finally {
      setUpdating(null);
    }
  };

  const toggleOrgActive = async (orgId: string, currentStatus: boolean | undefined) => {
    setUpdating(orgId);
    const newStatus = currentStatus === false ? true : false;
    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        isActive: newStatus,
        updatedAt: Timestamp.now()
      });
      setOrganizations(organizations.map(o =>
        o.id === orgId ? { ...o, isActive: newStatus } : o
      ));
    } catch (error) {
      console.error('Error toggling org status:', error);
      alert('Failed to update organization status');
    } finally {
      setUpdating(null);
    }
  };

  const toggleWordPress = async (orgId: string, currentStatus: boolean | undefined) => {
    setUpdating(orgId);
    const newStatus = !currentStatus;
    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        wordpressEnabled: newStatus,
        updatedAt: Timestamp.now()
      });
      setOrganizations(organizations.map(o =>
        o.id === orgId ? { ...o, wordpressEnabled: newStatus } : o
      ));
    } catch (error) {
      console.error('Error toggling WordPress:', error);
      alert('Failed to update WordPress access');
    } finally {
      setUpdating(null);
    }
  };

  const handleViewAsClient = async (orgId: string) => {
    try {
      await startImpersonation(orgId);
      navigate('/projects');
    } catch (error) {
      console.error('Error starting impersonation:', error);
      alert('Failed to view as client');
    }
  };

  const handleArchiveOrg = async (orgId: string, currentlyArchived: boolean) => {
    setUpdating(orgId);
    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        isArchived: !currentlyArchived,
        archivedAt: !currentlyArchived ? Timestamp.now() : null,
        updatedAt: Timestamp.now()
      });
      setOrganizations(organizations.map(o =>
        o.id === orgId ? { ...o, isArchived: !currentlyArchived } : o
      ));
    } catch (error) {
      console.error('Error archiving organization:', error);
      alert('Failed to archive organization');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTierBadgeColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case SubscriptionTier.ENTERPRISE:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case SubscriptionTier.PROFESSIONAL:
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case SubscriptionTier.STARTER:
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Organizations</h1>
          <p className="text-slate-500 text-sm">
            {filteredOrgs.length} of {organizations.length} organizations
          </p>
        </div>
        <button
          onClick={fetchOrganizations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or owner email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Tier Filter */}
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as SubscriptionTier | 'ALL')}
          className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="ALL">All Tiers</option>
          {Object.values(SubscriptionTier).map(tier => (
            <option key={tier} value={tier}>{tier}</option>
          ))}
        </select>

        {/* Archive Toggle */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${showArchived
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
            : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            {showArchived ? 'Showing Archived' : 'Show Archived'}
          </div>
        </button>
      </div>

      {/* Organizations List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="animate-pulse h-12 bg-slate-800 rounded"></div>
            </div>
          ))
        ) : filteredOrgs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500">
            No organizations found
          </div>
        ) : (
          filteredOrgs.map((org) => (
            <div
              key={org.id}
              className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
            >
              {/* Main Row */}
              <div
                className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-slate-800/50"
                onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
              >
                {/* Expand Icon */}
                <div className="text-slate-500">
                  {expandedOrg === org.id
                    ? <ChevronDown className="w-5 h-5" />
                    : <ChevronRight className="w-5 h-5" />
                  }
                </div>

                {/* Org Icon */}
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-400" />
                </div>

                {/* Org Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white truncate">{org.name}</h3>
                    {org.isActive === false && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">
                    Owner: {org.ownerEmail || 'Unknown'}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Users className="w-4 h-4" />
                    {org.memberCount}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <FolderOpen className="w-4 h-4" />
                    {org.projectCount}
                  </div>
                </div>

                {/* Tier Badge */}
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getTierBadgeColor(org.subscriptionTier)}`}>
                  {org.subscriptionTier}
                </span>

                {/* Created */}
                <span className="text-sm text-slate-500 whitespace-nowrap">
                  {formatDate(org.createdAt)}
                </span>
              </div>

              {/* Expanded Details */}
              {expandedOrg === org.id && (
                <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/50">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left: Details */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Organization Details
                      </h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-slate-500">ID:</dt>
                          <dd className="text-slate-300 font-mono text-xs">{org.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Owner ID:</dt>
                          <dd className="text-slate-300 font-mono text-xs">{org.ownerId}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Website:</dt>
                          <dd className="text-slate-300">{org.website || '—'}</dd>
                        </div>
                        {org.stripeCustomerId && (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Stripe ID:</dt>
                            <dd className="text-slate-300 font-mono text-xs">{org.stripeCustomerId}</dd>
                          </div>
                        )}
                      </dl>

                      {/* Tier Limits */}
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-6 mb-3">
                        Tier Limits
                      </h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Max Projects:</dt>
                          <dd className="text-slate-300">
                            {TIER_LIMITS[org.subscriptionTier].maxProjects === -1
                              ? 'Unlimited'
                              : TIER_LIMITS[org.subscriptionTier].maxProjects}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Max Articles/Month:</dt>
                          <dd className="text-slate-300">
                            {TIER_LIMITS[org.subscriptionTier].maxArticlesPerMonth === -1
                              ? 'Unlimited'
                              : TIER_LIMITS[org.subscriptionTier].maxArticlesPerMonth}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Credit Balance:</dt>
                          <dd className="text-emerald-400 font-bold">
                            {org.credits?.balance ?? 0}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Right: Actions */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Actions
                      </h4>

                      {/* Change Tier */}
                      <div className="mb-4">
                        <label className="block text-sm text-slate-400 mb-2">
                          Subscription Tier
                        </label>
                        <select
                          value={org.subscriptionTier}
                          onChange={(e) => updateOrgTier(org.id, e.target.value as SubscriptionTier)}
                          disabled={updating === org.id}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        >
                          {Object.values(SubscriptionTier).map(tier => (
                            <option key={tier} value={tier}>{tier}</option>
                          ))}
                        </select>
                      </div>

                      {/* View as Client */}
                      <button
                        onClick={() => handleViewAsClient(org.id)}
                        disabled={impersonationLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 mb-3"
                      >
                        {impersonationLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            View as Client
                          </>
                        )}
                      </button>

                      {/* Grant Credits */}
                      <button
                        onClick={() => setGrantModalOrg(org)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 mb-3"
                      >
                        <Gift className="w-4 h-4" />
                        Grant Credits
                      </button>

                      {/* View Statement */}
                      <button
                        onClick={() => setStatementModalOrg(org)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 mb-3"
                      >
                        <FileText className="w-4 h-4" />
                        View Statement
                      </button>

                      {/* WordPress Export Toggle */}
                      <button
                        onClick={() => toggleWordPress(org.id, org.wordpressEnabled)}
                        disabled={updating === org.id}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 mb-3 ${org.wordpressEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                          }`}
                      >
                        {updating === org.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Globe className="w-4 h-4" />
                            {org.wordpressEnabled ? 'WordPress Export: ON' : 'WordPress Export: OFF'}
                          </>
                        )}
                      </button>

                      {/* Suspend/Activate */}
                      <button
                        onClick={() => toggleOrgActive(org.id, org.isActive)}
                        disabled={updating === org.id}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 mb-3 ${org.isActive === false
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          }`}
                      >
                        {updating === org.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : org.isActive === false ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Reactivate Organization
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4" />
                            Suspend Organization
                          </>
                        )}
                      </button>

                      {/* Archive/Restore Organization */}
                      <button
                        onClick={() => handleArchiveOrg(org.id, !!org.isArchived)}
                        disabled={updating === org.id}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${org.isArchived
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          }`}
                      >
                        {updating === org.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : org.isArchived ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Restore Organization
                          </>
                        ) : (
                          <>
                            <Archive className="w-4 h-4" />
                            Archive Organization
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <AdminOrgStatementModal
        isOpen={!!statementModalOrg}
        onClose={() => setStatementModalOrg(null)}
        organization={statementModalOrg}
      />

      <AdminGrantCreditsModal
        isOpen={!!grantModalOrg}
        onClose={() => setGrantModalOrg(null)}
        organization={grantModalOrg}
        onSuccess={() => {
          fetchOrganizations(); // Refresh to show new balance
          setGrantModalOrg(null);
        }}
      />
    </div>
  );
};

export default AdminOrganizations;
