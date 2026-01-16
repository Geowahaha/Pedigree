import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import BreederProfileModal from '@/components/modals/BreederProfileModal';

const BreederProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  useEffect(() => {
    if (!userId) {
      navigate('/', { replace: true });
    }
  }, [navigate, userId]);

  if (!userId) return null;

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] animate-in fade-in duration-200">
      <BreederProfileModal
        isOpen={true}
        onClose={handleClose}
        userId={userId}
        currentUserId={user?.id}
        defaultMaximized={true}
      />
    </div>
  );
};

export default BreederProfilePage;
