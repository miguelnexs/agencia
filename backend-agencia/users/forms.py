from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import UserProfile, ROLE_CHOICES

class LoginForm(AuthenticationForm):
    username = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nombre de usuario'})
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Contraseña'})
    )
    
    class Meta:
        model = User
        fields = ['username', 'password']

class UserRegistrationForm(UserCreationForm):
    username = forms.CharField(
        required=True, 
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nombre de usuario'}),
        help_text='Este será el usuario para iniciar sesión en el sistema.'
    )
    email = forms.EmailField(required=True, widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Correo electrónico'}))
    first_name = forms.CharField(required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nombre'}))
    last_name = forms.CharField(required=True, widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Apellido'}))
    
    # Solo superadmin y admin pueden asignar roles
    role = forms.ChoiceField(choices=ROLE_CHOICES, required=True, widget=forms.Select(attrs={'class': 'form-control'}))
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password1', 'password2']
    
    def __init__(self, *args, **kwargs):
        self.creating_user = kwargs.pop('creating_user', None)
        self.user_role = kwargs.pop('user_role', None)
        super(UserRegistrationForm, self).__init__(*args, **kwargs)
        
        # Configurar campos de contraseña con mensajes más claros
        self.fields['password1'].widget = forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Contraseña'})
        self.fields['password1'].help_text = 'Ingrese la contraseña que utilizará para acceder al sistema.'
        self.fields['password2'].widget = forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Confirmar contraseña'})
        self.fields['password2'].help_text = 'Repita la contraseña para verificación.'
        
        # Restricciones según el rol del usuario que crea
        if self.user_role:
            if self.user_role == 'admin':
                # Los administradores solo pueden crear empleados
                self.fields['role'].choices = [choice for choice in ROLE_CHOICES if choice[0] == 'employee']
            elif self.user_role != 'super_admin':
                # Otros roles no pueden crear usuarios
                self.fields['role'].widget = forms.HiddenInput()
                self.fields['role'].initial = 'employee'
    
    def save(self, commit=True):
        user = super(UserRegistrationForm, self).save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        
        if commit:
            user.save()
            # Crear perfil de usuario con el rol seleccionado
            UserProfile.objects.create(
                user=user,
                role=self.cleaned_data.get('role', 'employee')
            )
        
        return user

class UserProfileForm(forms.ModelForm):
    cedula = forms.CharField(
        required=True, 
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Número de cédula'}),
        help_text='Ingrese un número de cédula válido (8-12 dígitos numéricos)'
    )
    phone = forms.CharField(
        required=False, 
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Teléfono'})
    )
    address = forms.CharField(
        required=False, 
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Dirección'})
    )
    birth_date = forms.DateField(
        required=False, 
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date'})
    )
    position = forms.CharField(
        required=False, 
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Cargo'})
    )
    department = forms.CharField(
        required=False, 
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Departamento'})
    )
    hire_date = forms.DateField(
        required=False, 
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date'})
    )
    
    class Meta:
        model = UserProfile
        fields = ['cedula', 'phone', 'address', 'birth_date', 'position', 'department', 'hire_date']

class UserUpdateForm(forms.ModelForm):
    email = forms.EmailField(required=True, widget=forms.EmailInput(attrs={'class': 'form-control'}))
    first_name = forms.CharField(required=True, widget=forms.TextInput(attrs={'class': 'form-control'}))
    last_name = forms.CharField(required=True, widget=forms.TextInput(attrs={'class': 'form-control'}))
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name']
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
        }