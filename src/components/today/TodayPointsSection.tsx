import { useState, useMemo } from 'react';
import { Award, Check, ShoppingBag, ChevronDown, ChevronUp, Send, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { useParentAuth } from '../../store/ParentAuth';
import { uid } from '../../lib/date';
import type { PointRequest } from '../../types';

interface TodayPointsSectionProps {
  dateKey: string;
  isToday: boolean;
  onRequestParentAuth: () => void;
}

export default function TodayPointsSection({
  dateKey,
  isToday,
  onRequestParentAuth,
}: TodayPointsSectionProps) {
  const { data, update, selectedChildId } = useStore();
  const { unlocked, activeMember } = useParentAuth();

  // 아코디언 열림/닫힘
  const [open, setOpen] = useState(true);

  // 부모 상벌점 즉시 부여 선택 상태
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');

  // 아이 상점 요청 선택 상태
  const [childReqRuleId, setChildReqRuleId] = useState<string>('');

  // 아이 보상 구매 선택 상태
  const [selectedRewardId, setSelectedRewardId] = useState<string>('');

  // 대상 아이
  const currentChildId =
    selectedChildId || (data.familyMembers ?? []).find((m) => m.role === 'child')?.id;
  const currentChild = (data.familyMembers ?? []).find((m) => m.id === currentChildId);

  // 상벌점 규칙 및 보상 목록
  const rules = data.pointRules ?? [];
  const rewards = data.rewardItems ?? [];

  // 로그 목록 (취소된 내역은 점수 합산에서 제외)
  const allLogs = data.pointLogs ?? [];
  const childLogs = useMemo(() => {
    return allLogs.filter((l) => !l.childId || l.childId === currentChildId);
  }, [allLogs, currentChildId]);

  // 오늘 날짜의 로그
  const todayLogs = useMemo(() => {
    return childLogs
      .filter((l) => l.date === dateKey)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [childLogs, dateKey]);

  // 누적 총 보유 상점 (취소되지 않은 유효한 로그만 합산)
  const totalBalance = useMemo(() => {
    return childLogs.filter((l) => !l.cancelled).reduce((acc, log) => acc + log.points, 0);
  }, [childLogs]);

  // 오늘 유효 획득/차감 점수 합계
  const todayPointsSum = useMemo(() => {
    return todayLogs.filter((l) => !l.cancelled).reduce((acc, log) => acc + log.points, 0);
  }, [todayLogs]);

  // 오늘 상점 합계 (+만)
  const todayBonusSum = useMemo(() => {
    return todayLogs
      .filter((l) => !l.cancelled && l.type === 'bonus')
      .reduce((acc, l) => acc + l.points, 0);
  }, [todayLogs]);

  // 오늘 벌점 합계 (-만, 절댓값)
  const todayPenaltySum = useMemo(() => {
    return todayLogs
      .filter((l) => !l.cancelled && l.type === 'penalty')
      .reduce((acc, l) => acc + Math.abs(l.points), 0);
  }, [todayLogs]);

  // 아이의 상점 요청 목록 (대기 중인 요청 등)
  const allRequests = data.pointRequests ?? [];
  const childRequests = useMemo(() => {
    return allRequests
      .filter((r) => r.childId === currentChildId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allRequests, currentChildId]);

  const pendingRequests = useMemo(() => {
    return childRequests.filter((r) => r.status === 'pending');
  }, [childRequests]);

  // [아이] 상점 받을 행동을 한 후 상점 요청하기
  const handleRequestPoints = () => {
    const rule = rules.find((r) => r.id === childReqRuleId);
    if (!rule) return;

    const childName = currentChild?.name || '아이';

    const newReq: PointRequest = {
      id: 'req-' + uid(),
      date: dateKey,
      timestamp: new Date().toISOString(),
      ruleId: rule.id,
      ruleTitle: rule.title,
      points: Number(rule.points),
      childId: currentChildId || 'unknown',
      childName,
      status: 'pending',
    };

    update((prev) => ({
      ...prev,
      pointRequests: [newReq, ...(prev.pointRequests ?? [])],
    }), `✨ ${childName}이가 [${rule.title}] (+${rule.points}점) 상점을 요청했습니다!`);

    setChildReqRuleId('');
    alert(`부모님께 [${rule.title}] 상점(${rule.points}점) 확인을 요청했습니다! 부모님이 확인 후 확정해주실 거예요. 😊`);
  };

  // [부모] 아이의 상점 요청 승인(확정)
  const handleApproveRequest = (req: PointRequest) => {
    if (!unlocked) {
      onRequestParentAuth();
      return;
    }

    const parentName = activeMember?.name || '부모님';

    update((prev) => {
      const newLog = {
        id: 'point-log-' + uid(),
        date: req.date,
        timestamp: new Date().toISOString(),
        type: 'bonus' as const,
        title: req.ruleTitle,
        points: Number(req.points),
        giverName: parentName,
        childId: req.childId,
      };

      const updatedRequests = (prev.pointRequests ?? []).map((r) =>
        r.id === req.id ? { ...r, status: 'approved' as const, resolvedAt: new Date().toISOString() } : r,
      );

      return {
        ...prev,
        pointLogs: [newLog, ...(prev.pointLogs ?? [])],
        pointRequests: updatedRequests,
      };
    }, `🎉 ${req.childName}의 [${req.ruleTitle}] 요청을 확인하고 상점(+${req.points}점)을 확정했습니다!`);
  };

  // [부모] 아이의 상점 요청 반려/거절
  const handleRejectRequest = (req: PointRequest) => {
    if (!unlocked) {
      onRequestParentAuth();
      return;
    }

    if (!window.confirm(`[${req.ruleTitle}] 요청을 반려하시겠습니까?`)) return;

    update((prev) => ({
      ...prev,
      pointRequests: (prev.pointRequests ?? []).map((r) =>
        r.id === req.id ? { ...r, status: 'rejected' as const, resolvedAt: new Date().toISOString() } : r,
      ),
    }), `${req.childName}의 [${req.ruleTitle}] 상점 요청이 보류되었습니다.`);
  };

  // [부모] 상점/벌점 직접 선택 후 체크/부여하기
  const handleAwardRule = () => {
    if (!unlocked) {
      onRequestParentAuth();
      return;
    }
    const rule = rules.find((r) => r.id === selectedRuleId);
    if (!rule) return;

    const points = rule.type === 'bonus' ? Number(rule.points) : -Number(rule.points);
    const parentName = activeMember?.name || '부모님';

    update((prev) => {
      const newLog = {
        id: 'point-log-' + uid(),
        date: dateKey,
        timestamp: new Date().toISOString(),
        type: rule.type,
        title: rule.title,
        points,
        giverName: parentName,
        childId: currentChildId,
      };
      return {
        ...prev,
        pointLogs: [newLog, ...(prev.pointLogs ?? [])],
      };
    }, `${currentChild?.name || '아이'}에게 [${rule.title}] ${points > 0 ? `+${points}` : points}점을 부여했습니다. ⭐`);

    setSelectedRuleId('');
  };

  // [아이] 구매하고자 하는 보상을 선택해서 구매
  const handlePurchaseReward = () => {
    const reward = rewards.find((r) => r.id === selectedRewardId);
    if (!reward) return;

    if (totalBalance < reward.price) {
      alert(`상점이 부족해요! (필요: ${reward.price}점 / 현재 보유: ${totalBalance}점)`);
      return;
    }

    const confirmed = window.confirm(
      `[${reward.title}]을(를) 구매하시겠습니까?\n누적 상점에서 ${reward.price}점이 차감됩니다.`,
    );
    if (!confirmed) return;

    update((prev) => {
      const newLog = {
        id: 'point-log-' + uid(),
        date: dateKey,
        timestamp: new Date().toISOString(),
        type: 'reward_purchase' as const,
        title: reward.title,
        points: -Number(reward.price),
        giverName: '상점 교환',
        childId: currentChildId,
      };
      return {
        ...prev,
        pointLogs: [newLog, ...(prev.pointLogs ?? [])],
      };
    }, `🎉 [${reward.title}]을(를) 구매했습니다! (-${reward.price}점)`);

    setSelectedRewardId('');
  };

  // [부모] 상점 사용(구매) 내역 취소 및 상점 복구 기능
  const handleCancelPurchase = (logId: string) => {
    if (!unlocked) {
      onRequestParentAuth();
      return;
    }

    const log = childLogs.find((l) => l.id === logId);
    if (!log) return;

    const reason = window.prompt(
      `[${log.title}] 구매를 취소하시겠습니까?\n차감되었던 ${Math.abs(log.points)}점이 아이의 상점으로 즉시 환불(복구)됩니다.\n\n취소 사유를 입력해주세요 (선택):`,
      '아이와 상의 후 취소',
    );
    if (reason === null) return; // 취소 버튼 누름

    update((prev) => ({
      ...prev,
      pointLogs: (prev.pointLogs ?? []).map((l) =>
        l.id === logId
          ? {
              ...l,
              cancelled: true,
              cancelledAt: new Date().toISOString(),
              cancelledReason: reason || '부모 합의 취소',
            }
          : l,
      ),
    }), `[${log.title}] 구매가 취소되어 상점 ${Math.abs(log.points)}점이 복구되었습니다. 🔄`);
  };

  // [부모] 기록 영구 삭제 (오기입 시)
  const handleDeleteLog = (logId: string) => {
    if (!unlocked) return;
    if (!window.confirm('이 기록을 완전히 삭제하시겠습니까?')) return;
    update((prev) => ({
      ...prev,
      pointLogs: (prev.pointLogs ?? []).filter((l) => l.id !== logId),
    }), '상점/벌점 기록을 삭제했습니다.');
  };

  return (
    <div className="paper-card mb-4 overflow-hidden border border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
      {/* 헤더 */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center justify-between p-3.5 hover:bg-amber-100/30 transition select-none"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
            <Award size={17} />
          </span>
          <div>
            <span className="font-hand text-lg font-bold text-ink">
              {currentChild?.name || '아이'}의 상점 / 벌점
            </span>
            <span className="ml-2 text-xs text-ink-muted">
              (Today: <strong className={todayPointsSum >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {todayPointsSum > 0 ? `+${todayPointsSum}` : todayPointsSum}점
              </strong> / 누적: <strong className="text-amber-600">{totalBalance}점</strong>)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingRequests.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 animate-pulse">
              요청 {pendingRequests.length}건 대기
            </span>
          )}
          <button type="button" className="text-ink-soft">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          {/* 1. 요약 배너 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-ink-muted block">Today 상점</span>
              <span className="font-bold text-emerald-600 text-sm">+{todayBonusSum}점</span>
            </div>
            <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-ink-muted block">Today 벌점</span>
              <span className="font-bold text-rose-600 text-sm">-{todayPenaltySum}점</span>
            </div>
            <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-ink-muted block">Today 합계</span>
              <span className={`font-bold text-sm ${todayPointsSum >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {todayPointsSum > 0 ? `+${todayPointsSum}` : todayPointsSum}점
              </span>
            </div>
            <div className="rounded-xl bg-amber-100/60 p-2.5 border border-amber-200 text-amber-900 shadow-2xs">
              <span className="text-[10px] text-amber-800 font-semibold block">누적 보유 상점</span>
              <span className="font-hand font-extrabold text-base text-amber-700">
                {totalBalance}점
              </span>
            </div>
          </div>

          {/* 2-A. [대기 중인 상점 요청 확인 (부모 전용 승인/반려 박스)] */}
          {pendingRequests.length > 0 && (
            <div className="rounded-xl bg-gradient-to-r from-amber-100/90 to-orange-100/90 p-3.5 border-2 border-amber-400 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <span className="text-base">📢</span>
                  <span>아이가 상점 확인을 요청했어요! ({pendingRequests.length}건)</span>
                </span>
                {!unlocked && (
                  <button
                    type="button"
                    onClick={onRequestParentAuth}
                    className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950"
                  >
                    부모 모드로 확인하기 →
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white p-2.5 border border-amber-200 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-ink truncate">
                          {req.childName}: [{req.ruleTitle}]
                        </span>
                        <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          +{req.points}점
                        </span>
                      </div>
                      <span className="text-[10px] text-ink-muted block mt-0.5">
                        요청 시각: {new Date(req.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      {unlocked ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(req)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs active:scale-95"
                          >
                            <CheckCircle2 size={13} />
                            <span>확인 및 상점 확정</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req)}
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-ink-soft hover:bg-slate-200"
                          >
                            <XCircle size={13} />
                            <span>보류</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={onRequestParentAuth}
                          className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-600"
                        >
                          부모 인증 후 확정
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2-B. [아이 전용: 상점 받을 행동 후 상점 요청하기] */}
          <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                <span>🙋</span>
                <span>아이 전용: 상점 받을 행동을 했어요! (상점 요청하기)</span>
              </span>
              <span className="text-[11px] text-emerald-700">부모님께 확인 요청을 보내요</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={childReqRuleId}
                onChange={(e) => setChildReqRuleId(e.target.value)}
                className="flex-1 rounded-xl bg-white border border-emerald-300 px-3 py-2 text-xs font-medium text-ink focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">방금 실천한 상점 항목을 선택하세요</option>
                {rules
                  .filter((r) => r.type === 'bonus')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      [+{r.points}점] {r.title} ({r.category || '기본'})
                    </option>
                  ))}
              </select>

              <button
                type="button"
                disabled={!childReqRuleId}
                onClick={handleRequestPoints}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs ${
                  childReqRuleId
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                    : 'bg-slate-200 text-ink-muted cursor-not-allowed'
                }`}
              >
                <Send size={13} />
                <span>상점 요청하기</span>
              </button>
            </div>
          </div>

          {/* 3. [부모 전용: 상점/벌점 직접 선택 & 즉시 부여] */}
          {unlocked ? (
            <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <span>👨‍👩‍👧</span>
                  <span>부모 전용: 상점 / 벌점 직접 부여하기</span>
                </span>
                <span className="text-[11px] text-amber-700">아이의 이야기를 듣고 체크해주세요</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedRuleId}
                  onChange={(e) => setSelectedRuleId(e.target.value)}
                  className="flex-1 rounded-xl bg-white border border-amber-300 px-3 py-2 text-xs font-medium text-ink focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">항목을 선택하세요 (상점/벌점 목록)</option>
                  <optgroup label="✨ 상점 받을 항목 (+)">
                    {rules
                      .filter((r) => r.type === 'bonus')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          [+{r.points}점] {r.title} ({r.category || '기본'})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="⚠️ 벌점 받을 항목 (-)">
                    {rules
                      .filter((r) => r.type === 'penalty')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          [-{r.points}점] {r.title} ({r.category || '기본'})
                        </option>
                      ))}
                  </optgroup>
                </select>

                <button
                  type="button"
                  disabled={!selectedRuleId}
                  onClick={handleAwardRule}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs ${
                    selectedRuleId
                      ? 'bg-amber-600 text-white hover:bg-amber-700 active:scale-95'
                      : 'bg-slate-200 text-ink-muted cursor-not-allowed'
                  }`}
                >
                  <Check size={14} strokeWidth={3} />
                  <span>체크 및 부여</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200/60 text-xs text-ink-soft">
              <span>💡 벌점 부여나 직접 체크는 <strong>부모 모드</strong>에서 할 수 있어요.</span>
              <button
                type="button"
                onClick={onRequestParentAuth}
                className="font-bold text-amber-600 hover:underline shrink-0 ml-2"
              >
                부모 모드로 전환 →
              </button>
            </div>
          )}

          {/* 4. 아이: 누적 상점으로 보상 구매하기 드롭다운 */}
          <div className="rounded-xl bg-purple-50/60 p-3 border border-purple-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1">
                <span>🎁</span>
                <span>누적 상점으로 보상 구매하기</span>
              </span>
              <span className="text-[11px] text-purple-700">현재 보유: {totalBalance}점</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={selectedRewardId}
                onChange={(e) => setSelectedRewardId(e.target.value)}
                className="flex-1 rounded-xl bg-white border border-purple-300 px-3 py-2 text-xs font-medium text-ink focus:outline-hidden focus:ring-1 focus:ring-purple-500"
              >
                <option value="">원하는 보상을 선택하세요</option>
                {rewards.map((rew) => {
                  const affordable = totalBalance >= rew.price;
                  return (
                    <option key={rew.id} value={rew.id} disabled={!affordable}>
                      [{rew.price}점] {rew.title} {affordable ? '(구매가능)' : `(${rew.price - totalBalance}점 부족)`}
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                disabled={!selectedRewardId}
                onClick={handlePurchaseReward}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs ${
                  selectedRewardId
                    ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                    : 'bg-slate-200 text-ink-muted cursor-not-allowed'
                }`}
              >
                <ShoppingBag size={14} />
                <span>선택 항목 구매</span>
              </button>
            </div>
          </div>

          {/* 5. 오늘의 상점/벌점 & 구매 내역 목록 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-ink">
                오늘 부여 및 사용 내역 ({todayLogs.length}건)
              </span>
              <span className="text-[11px] text-ink-muted">
                {isToday ? '오늘' : dateKey} 기준
              </span>
            </div>

            {todayLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-xs text-ink-soft">
                오늘 부여되거나 구매한 내역이 아직 없습니다.
              </div>
            ) : (
              <div className="space-y-1.5">
                {todayLogs.map((log) => {
                  const isBonus = log.type === 'bonus';
                  const isPenalty = log.type === 'penalty';
                  const isPurchase = log.type === 'reward_purchase';
                  const isCancelled = !!log.cancelled;

                  return (
                    <div
                      key={log.id}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 border transition ${
                        isCancelled
                          ? 'bg-slate-100/70 border-slate-200 opacity-60'
                          : 'bg-white border-slate-100 shadow-2xs'
                      } text-xs`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
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
                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-ink ${isCancelled ? 'line-through text-slate-400' : ''}`}>
                              {log.title}
                            </span>
                            {isCancelled && (
                              <span className="rounded-md bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-700">
                                구매 취소(상점 복구됨)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-ink-muted">
                            {new Date(log.timestamp).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {log.giverName && ` · ${log.giverName}`}
                            {log.cancelledReason && ` · 사유: ${log.cancelledReason}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-hand text-base font-extrabold ${
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

                        {/* 부모 모드인 경우: 구매 취소(환불) 버튼 또는 기록 삭제 */}
                        {unlocked && (
                          <div className="flex items-center gap-1">
                            {isPurchase && !isCancelled && (
                              <button
                                type="button"
                                onClick={() => handleCancelPurchase(log.id)}
                                className="flex items-center gap-0.5 rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 hover:bg-purple-100 transition"
                                title="아이와 합의 후 구매 취소 및 상점 복구"
                              >
                                <RotateCcw size={10} />
                                <span>구매 취소</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(log.id)}
                              className="text-[10px] text-slate-400 hover:text-rose-600 px-1"
                              title="기록 삭제"
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
        </div>
      )}
    </div>
  );
}

