"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Interview } from "@/types/interview";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface EditInterviewMetadataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interview: Interview | null;
  onUpdate?: (updatedInterview: Partial<Interview>) => void;
}

export function EditInterviewMetadataModal({
  open,
  onOpenChange,
  interview,
  onUpdate
}: EditInterviewMetadataModalProps) {
  const [title, setTitle] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    if (interview) {
      setTitle(interview.title || "");
      // interview_date가 있으면 날짜 형식으로 변환
      if (interview.interview_date) {
        const date = new Date(interview.interview_date);
        setInterviewDate(date.toISOString().split('T')[0]);
      } else {
        setInterviewDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [interview]);

  const handleSubmit = async () => {
    if (!interview || !session?.access_token) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/interviews/${interview.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title,
          interview_date: interviewDate
        })
      });

      if (!response.ok) {
        throw new Error('정보 수정에 실패했습니다.');
      }

      const result = await response.json();
      
      toast.success('인터뷰 정보가 수정되었습니다.');
      
      if (onUpdate && result.data) {
        onUpdate(result.data);
      }
      
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>인터뷰 정보 수정</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="인터뷰 제목을 입력하세요"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="interview-date">인터뷰 날짜</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="interview-date"
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? '수정 중...' : '수정'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}