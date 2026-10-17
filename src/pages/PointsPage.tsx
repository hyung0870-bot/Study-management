import { useState, useMemo } from 'react';
import { Award, Plus, Trash2, Pencil, ShoppingBag, Lock, Gift, RotateCcw } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PinGateModal from '../components/parent/PinGateModal';
import { useStore } from '../store/StoreContext';
import { useParentAuth } from '../store/ParentAuth';
import { uid } from '../lib/date';
import type { PointRule, RewardItem } from '../types';

export default function PointsPage() {
  const { data, update, selectedChildId } = useStore();
  const { unlocked } = useParentAuth();
  const [pinOpen, setPinOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'rewards' | 'history'>('rules');

  // 모달 상태
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PointRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<PointRule | null>(null);

  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [deletingReward, setDeletingReward] = useState<RewardItem | null>(null);

  // 규칙 폼 상태
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleType, setRuleType] = useState<'bonus' | 'penalty'>('bonus');
  const [rulePoints, setRulePoints] = useState<number>(5);
  const [ruleCategory, setRuleCategory] = useState('');

  // 보상 폼 상태
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardPrice, setRewardPrice] = useState<number>(20);
  const [rewardDesc, setRewardDesc] = useState('');

  // 대상 아이 정보
  const currentChildId =
    selectedChildId || (data.familyMembers ?? []).find((m) => m.role === 'child')?.id;
  const currentChild = (data.familyMembers ?? []).find((m) => m.id === currentChildId);

  // 상벌점 규칙 목록
  const rules = data.pointRules ?? [];
  const bonusRules = useMemo(() => rules.filter((r) => r.type === 'bonus'), [rules]);
  const penaltyRules = useMemo(() => rules.filter((r) => r.type === 'penalty'), [rules]);

  // 보상 목록
  const rewards = data.rewardItems ?? [];

  // 로그 목록
  const allLogs = data.pointLogs ?? [];
  const childLogs = useMemo(() => {
    return allLogs
      .filter((l) => !l.childId || l.childId === currentChildId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allLogs, currentChildId]);

  // 누적 점수 계산 (취소된 내역 제외)
  const totalBalance = useMemo(() => {
    return childLogs.filter((l) => !l.cancelled).reduce((acc, log) => acc + log.points, 0);
  }, [childLogs]);

  const totalEarnedBonus = useMemo(() => {
    return childLogs.filter((l) => !l.cancelled && l.type === 'bonus').reduce((acc, l) => acc + l.points, 0);
  }, [childLogs]);

  const totalPenalties = useMemo(() => {
    return childLogs.filter((l) => !l.cancelled && l.type === 'penalty').reduce((acc, l) => acc + Math.abs(l.points), 0);
  }, [childLogs]);

  const totalUsedRewards = useMemo(() => {
    return childLogs.filter((l) => !l.cancelled && l.type === 'reward_purchase').reduce((acc, l) => acc + Math.abs(l.points), 0);
  }, [childLogs]);

  // 규칙 등록 / 수정 열기
  const openRuleModal = (rule?: PointRule) => {
    if (!unlocked) {
      setPinOpen(true);
      return;
    }
    if (rule) {
      setEditingRule(rule);
      setRuleTitle(rule.title);
      setRuleType(rule.type);
      setRulePoints(rule.points);
      setRuleCategory(rule.category || '');
    } else {
      setEditingRule(null);
      setRuleTitle('');
      setRuleType('bonus');
      setRulePoints(5);
      setRuleCategory('생활습관');
    }
    setRuleModalOpen(true);
  };

  // 규칙 저장
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim()) return;

    update((prev) => {
      const prevRules = prev.pointRules ?? [];
      let nextRules: PointRule[];
      if (editingRule) {
        nextRules = prevRules.map((r) =>
          r.id === editingRule.id
            ? { ...r, title: ruleTitle.trim(), type: ruleType, points: Number(rulePoints), category: ruleCategory.trim() }
            : r,
        );
      } else {
        const newRule: PointRule = {
          id: 'rule-' + uid(),
          title: ruleTitle.trim(),
          type: ruleType,
          points: Number(rulePoints),
          category: ruleCategory.trim() || (ruleType === 'bonus' ? '생활습관' : '주의사항'),
        };
        nextRules = [...prevRules, newRule];
      }
      return {
        ...prev,
        pointRules: nextRules,
      };
    }, `${ruleType === 'bonus' ? '상점' : '벌점'} 항목 "${ruleTitle.trim()}"을(를) ${editingRule ? '수정' : '추가'}했습니다.`);

    setRuleModalOpen(false);
  };

  // 규칙 삭제
  const handleDeleteRule = (rule: PointRule) => {
    update((prev) => ({
      ...prev,
      pointRules: (prev.pointRules ?? []).filter((r) => r.id !== rule.id),
    }), `항목 "${rule.title}"을(를) 삭제했습니다.`);
    setDeletingRule(null);
  };

  // 보상 등록 / 수정 열기
  const openRewardModal = (reward?: RewardItem) => {
    if (!unlocked) {
      setPinOpen(true);
      return;
    }
    if (reward) {
      setEditingReward(reward);
      setRewardTitle(reward.title);
      setRewardPrice(reward.price);
      setRewardDesc(reward.description || '');
    } else {
      setEditingReward(null);
      setRewardTitle('');
      setRewardPrice(20);
      setRewardDesc('');
    }
    setRewardModalOpen(true);
  };

  // 보상 저장
  const handleSaveReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTitle.trim()) return;

    update((prev) => {
      const prevRewards = prev.rewardItems ?? [];
      let nextRewards: RewardItem[];
      if (editingReward) {
        nextRewards = prevRewards.map((r) =>
          r.id === editingReward.id
            ? { ...r, title: rewardTitle.trim(), price: Number(rewardPrice), description: rewardDesc.trim() }
            : r,
        );
      } else {
        const newReward: RewardItem = {
          id: 'reward-' + uid(),
          title: rewardTitle.trim(),
          price: Number(rewardPrice),
          description: rewardDesc.trim(),
        };
        nextRewards = [...prevRewards, newReward];
      }
      return {
        ...prev,
        rewardItems: nextRewards,
      };
    }, `보상 상품 "${rewardTitle.trim()}"을(를) ${editingReward ? '수정' : '추가'}했습니다.`);

    setRewardModalOpen(false);
  };

  // 보상 삭제
  const handleDeleteReward = (reward: RewardItem) => {
    update((prev) => ({
      ...prev,
      rewardItems: (prev.rewardItems ?? []).filter((r) => r.id !== reward.id),
    }), `보상 상품 "${reward.title}"을(를) 삭제했습니다.`);
    setDeletingReward(null);
  };

  return (
    <>
      <PageHeader
        title="상점 / 벌점 관리"
        subtitle={
          unlocked
            ? `부모 모드: 항목 및 보상 편집 가능 (학생: ${currentChild?.name || '아이'})`
            : `읽기 모드: 점수 항목과 구매 가능한 보상을 확인할 수 있어요`
        }
        right={
          !unlocked ? (
            <button
              type="button"
              onClick={() => setPinOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-ink-soft hover:bg-slate-200"
            >
              <Lock size={13} /> 학부모 모드로 전환
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {activeTab === 'rules' && (
                <button
                  type="button"
                  onClick={() => openRuleModal()}
                  className="btn-primary !px-3 !py-1.5 !text-xs"
                >
                  <Plus size={15} /> 항목 추가
                </button>
              )}
              {activeTab === 'rewards' && (
                <button
                  type="button"
                  onClick={() => openRewardModal()}
                  className="btn-primary !px-3 !py-1.5 !text-xs bg-purple-600 hover:bg-purple-700"
                >
                  <Plus size={15} /> 보상 추가
                </button>
              )}
            </div>
          )
        }
      />

      {/* 요약 점수 카드 */}
      <div className="mb-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-purple-500/10 p-4 border border-amber-200/60 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-ink-soft">
              {currentChild?.name || '아이'}의 누적 보유 상점
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`font-hand text-3xl font-extrabold ${totalBalance >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                {totalBalance > 0 ? `+${totalBalance}` : totalBalance}
              </span>
              <span className="text-sm font-bold text-ink">점</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="rounded-xl bg-white/80 px-2.5 py-1.5 border border-slate-200/60 text-center">
              <span className="text-[10px] text-ink-muted block">총 획득 상점</span>
              <span className="font-bold text-emerald-600">+{totalEarnedBonus}점</span>
            </div>
            <div className="rounded-xl bg-white/80 px-2.5 py-1.5 border border-slate-200/60 text-center">
              <span className="text-[10px] text-ink-muted block">총 차감 벌점</span>
              <span className="font-bold text-rose-600">-{totalPenalties}점</span>
            </div>
            <div className="rounded-xl bg-white/80 px-2.5 py-1.5 border border-slate-200/60 text-center">
              <span className="text-[10px] text-ink-muted block">보상 사용</span>
              <span className="font-bold text-purple-600">-{totalUsedRewards}점</span>
            </div>
          </div>
        </div>
      </div>

      {/* 상단 탭 전환 바 */}
      <div className="mb-4 flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`flex-1 rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'rules' ? 'bg-white text-ink shadow-xs' : 'text-ink-soft hover:text-ink'
          }`}
        >
          <Award size={15} />
          상점/벌점 항목 ({rules.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rewards')}
          className={`flex-1 rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'rewards' ? 'bg-white text-ink shadow-xs' : 'text-ink-soft hover:text-ink'
          }`}
        >
          <Gift size={15} />
          보상/상품 목록 ({rewards.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history' ? 'bg-white text-ink shadow-xs' : 'text-ink-soft hover:text-ink'
          }`}
        >
          <ShoppingBag size={15} />
          부여/구매 내역 ({childLogs.length})
        </button>
      </div>

      {/* 1. 상점/벌점 항목 탭 */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* 상점 받을 항목 */}
          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">
                  +
                </span>
                <h3 className="font-bold text-ink text-sm">상점 받을 항목</h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {bonusRules.length}개
                </span>
              </div>
              {unlocked && (
                <button
                  type="button"
                  onClick={() => {
                    openRuleModal();
                    setRuleType('bonus');
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                >
                  <Plus size={13} /> 상점 추가
                </button>
              )}
            </div>

            {bonusRules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-6 text-center text-xs text-ink-soft">
                등록된 상점 항목이 없습니다.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {bonusRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-100 shadow-xs hover:border-emerald-200 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-ink truncate">{rule.title}</span>
                        {rule.category && (
                          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-ink-soft">
                            {rule.category}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-emerald-600 mt-0.5 inline-block">
                        +{rule.points}점 부여
                      </span>
                    </div>

                    {unlocked && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openRuleModal(rule)}
                          className="rounded-lg p-1.5 text-ink-soft hover:bg-slate-100 hover:text-ink transition"
                          title="수정"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRule(rule)}
                          className="rounded-lg p-1.5 text-ink-soft hover:bg-rose-50 hover:text-rose-600 transition"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 벌점 받을 항목 */}
          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-700 text-xs font-bold">
                  -
                </span>
                <h3 className="font-bold text-ink text-sm">벌점 받을 항목</h3>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  {penaltyRules.length}개
                </span>
              </div>
              {unlocked && (
                <button
                  type="button"
                  onClick={() => {
                    openRuleModal();
                    setRuleType('penalty');
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5"
                >
                  <Plus size={13} /> 벌점 추가
                </button>
              )}
            </div>

            {penaltyRules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-6 text-center text-xs text-ink-soft">
                등록된 벌점 항목이 없습니다.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {penaltyRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-100 shadow-xs hover:border-rose-200 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-ink truncate">{rule.title}</span>
                        {rule.category && (
                          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-ink-soft">
                            {rule.category}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-rose-600 mt-0.5 inline-block">
                        -{rule.points}점 차감
                      </span>
                    </div>

                    {unlocked && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openRuleModal(rule)}
                          className="rounded-lg p-1.5 text-ink-soft hover:bg-slate-100 hover:text-ink transition"
                          title="수정"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRule(rule)}
                          className="rounded-lg p-1.5 text-ink-soft hover:bg-rose-50 hover:text-rose-600 transition"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {!unlocked && (
            <p className="text-center text-xs text-ink-soft bg-slate-50 rounded-xl p-3 border border-slate-200/60">
              💡 항목 추가 및 점수 수정은 <strong>학부모 모드</strong>에서만 가능합니다.
            </p>
          )}
        </div>
      )}

      {/* 2. 보상 상품 목록 탭 */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-soft">
              열심히 모은 상점으로 교환할 수 있는 보상 목록입니다. (오늘할일 탭에서 구매 가능)
            </p>
            {unlocked && (
              <button
                type="button"
                onClick={() => openRewardModal()}
                className="btn-primary !px-3 !py-1.5 !text-xs shrink-0 bg-purple-600 hover:bg-purple-700"
              >
                <Plus size={14} /> 보상 등록
              </button>
            )}
          </div>

          {rewards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-8 text-center text-xs text-ink-soft">
              등록된 보상이 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="rounded-xl bg-white p-4 border border-slate-100 shadow-xs flex flex-col justify-between hover:border-purple-200 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-ink">{reward.title}</h4>
                      <span className="shrink-0 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 border border-purple-200/50">
                        {reward.price} 상점
                      </span>
                    </div>
                    {reward.description && (
                      <p className="mt-1 text-xs text-ink-soft leading-relaxed">{reward.description}</p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-ink-muted">
                      {totalBalance >= reward.price ? (
                        <span className="text-emerald-600 font-bold">✨ 교환 가능</span>
                      ) : (
                        <span className="text-ink-soft">
                          {reward.price - totalBalance}점 더 필요해요
                        </span>
                      )}
                    </span>

                    {unlocked && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openRewardModal(reward)}
                          className="rounded-lg p-1.5 text-ink-soft hover:bg-slate-100 hover:text-ink transition"
                          title="수정"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingReward(reward)}
                          className="rounded-lg p-1.5 text-ink-soft hover:bg-rose-50 hover:text-rose-600 transition"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. 부여 / 구매 히스토리 내역 탭 */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <p className="text-xs text-ink-soft">
            {currentChild?.name || '아이'}에게 부여된 상/벌점 및 구매한 보상 내역입니다.
          </p>

          {childLogs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-8 text-center text-xs text-ink-soft">
              아직 부여되거나 구매한 내역이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl bg-white border border-slate-100 shadow-xs overflow-hidden">
              {childLogs.map((log) => {
                const isBonus = log.type === 'bonus';
                const isPenalty = log.type === 'penalty';
                const isPurchase = log.type === 'reward_purchase';
                const isCancelled = !!log.cancelled;

                return (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between p-3.5 transition ${
                      isCancelled ? 'bg-slate-50/80 opacity-60' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                          isCancelled
                            ? 'bg-slate-200 text-slate-500 line-through'
                            : isBonus
                            ? 'bg-emerald-100 text-emerald-700'
                            : isPenalty
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {isCancelled ? '✕' : isBonus ? '+' : isPenalty ? '-' : '🎁'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold text-sm text-ink truncate ${isCancelled ? 'line-through text-slate-400' : ''}`}>
                            {log.title}
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] text-ink-muted shrink-0">
                            {isBonus ? '상점' : isPenalty ? '벌점' : '보상 구매'}
                          </span>
                          {isCancelled && (
                            <span className="rounded-md bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 shrink-0">
                              구매 취소됨 (상점 복구됨)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-soft mt-0.5">
                          {log.date} · {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          {log.giverName && ` · ${log.giverName}`}
                          {log.cancelledReason && ` · 취소사유: ${log.cancelledReason}`}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`font-hand text-lg font-extrabold ${
                          isCancelled
                            ? 'text-slate-400 line-through'
                            : isBonus
                            ? 'text-emerald-600'
                            : isPenalty
                            ? 'text-rose-600'
                            : 'text-purple-600'
                        }`}
                      >
                        {log.points > 0 ? `+${log.points}` : log.points}점
                      </span>

                      {unlocked && (
                        <div className="flex items-center gap-1 ml-1">
                          {isPurchase && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => {
                                const reason = window.prompt(
                                  `[${log.title}] 구매를 취소하시겠습니까?\n차감되었던 ${Math.abs(log.points)}점이 상점으로 즉시 환불(복구)됩니다.\n\n취소 사유:`,
                                  '아이와 상의 후 취소',
                                );
                                if (reason === null) return;
                                update((prev) => ({
                                  ...prev,
                                  pointLogs: (prev.pointLogs ?? []).map((l) =>
                                    l.id === log.id
                                      ? { ...l, cancelled: true, cancelledAt: new Date().toISOString(), cancelledReason: reason || '부모 합의 취소' }
                                      : l,
                                  ),
                                }), `[${log.title}] 구매가 취소되어 상점 ${Math.abs(log.points)}점이 복구되었습니다. 🔄`);
                              }}
                              className="flex items-center gap-0.5 rounded-lg bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 transition"
                              title="아이와 합의 후 구매 취소 및 상점 복구"
                            >
                              <RotateCcw size={11} />
                              <span>구매 취소</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm('이 기록을 완전히 삭제하시겠습니까?')) return;
                              update((prev) => ({
                                ...prev,
                                pointLogs: (prev.pointLogs ?? []).filter((l) => l.id !== log.id),
                              }), '기록이 삭제되었습니다.');
                            }}
                            className="text-xs text-slate-400 hover:text-rose-600 px-1.5 py-0.5"
                            title="기록 영구 삭제"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 상벌점 규칙 모달 (부모만) */}
      {ruleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-hand text-xl font-bold text-ink mb-3">
              {editingRule ? '상점/벌점 항목 수정' : '새 상점/벌점 항목 추가'}
            </h3>

            <form onSubmit={handleSaveRule} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-ink-soft block mb-1">유형 선택</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRuleType('bonus')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      ruleType === 'bonus'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-ink-soft hover:bg-slate-50'
                    }`}
                  >
                    + 상점 받기
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleType('penalty')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      ruleType === 'penalty'
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-slate-200 text-ink-soft hover:bg-slate-50'
                    }`}
                  >
                    - 벌점 받기
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink-soft block mb-1">항목명</label>
                <input
                  type="text"
                  required
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  placeholder="예: 스스로 책상 정리하기, 독서 30분"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-ink focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-ink-soft block mb-1">
                    {ruleType === 'bonus' ? '부여 점수 (상점)' : '차감 점수 (벌점)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      max={1000}
                      value={rulePoints}
                      onChange={(e) => setRulePoints(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-ink focus:outline-hidden pr-8 font-bold"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-ink-muted">점</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-soft block mb-1">분류 / 카테고리</label>
                  <input
                    type="text"
                    value={ruleCategory}
                    onChange={(e) => setRuleCategory(e.target.value)}
                    placeholder="예: 생활습관, 예절"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRuleModalOpen(false)}
                  className="btn-ghost !px-3 !py-2 !text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={`btn-primary !px-4 !py-2 !text-xs ${
                    ruleType === 'bonus' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {editingRule ? '수정 완료' : '추가하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 보상 상품 등록/수정 모달 (부모만) */}
      {rewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-hand text-xl font-bold text-ink mb-3">
              {editingReward ? '보상 상품 수정' : '새 보상 상품 등록'}
            </h3>

            <form onSubmit={handleSaveReward} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-ink-soft block mb-1">보상 이름</label>
                <input
                  type="text"
                  required
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  placeholder="예: 자유 게임 30분, 간식 사먹기"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-ink-soft block mb-1">필요 상점 (가격)</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={1}
                    max={10000}
                    value={rewardPrice}
                    onChange={(e) => setRewardPrice(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-ink focus:outline-hidden pr-8 font-bold text-purple-700"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-ink-muted">점</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink-soft block mb-1">설명 또는 사용 조건 (선택)</label>
                <textarea
                  value={rewardDesc}
                  onChange={(e) => setRewardDesc(e.target.value)}
                  placeholder="예: 주말 또는 숙제 완료 후 사용 가능"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-ink focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRewardModalOpen(false)}
                  className="btn-ghost !px-3 !py-2 !text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn-primary !px-4 !py-2 !text-xs bg-purple-600 hover:bg-purple-700"
                >
                  {editingReward ? '수정 완료' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 항목 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={!!deletingRule}
        title="항목 삭제 확인"
        message={`"${deletingRule?.title || ''}" 항목을 정말 삭제하시겠습니까?`}
        confirmLabel="삭제"
        danger
        onConfirm={() => deletingRule && handleDeleteRule(deletingRule)}
        onClose={() => setDeletingRule(null)}
      />

      {/* 보상 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={!!deletingReward}
        title="보상 상품 삭제 확인"
        message={`"${deletingReward?.title || ''}" 보상 상품을 정말 삭제하시겠습니까?`}
        confirmLabel="삭제"
        danger
        onConfirm={() => deletingReward && handleDeleteReward(deletingReward)}
        onClose={() => setDeletingReward(null)}
      />

      {/* PIN 인증 모달 */}
      <PinGateModal open={pinOpen} onClose={() => setPinOpen(false)} />
    </>
  );
}
